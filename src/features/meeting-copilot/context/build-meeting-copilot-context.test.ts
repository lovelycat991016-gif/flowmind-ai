import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  retrieveMeetingContext: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock(
  "@/features/meeting-knowledge/queries/retrieve-meeting-context",
  () => ({ retrieveMeetingContext: mocks.retrieveMeetingContext }),
);

import {
  buildMeetingCopilotContext,
  formatMeetingCopilotContext,
} from "./build-meeting-copilot-context";

function query(result: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    status: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
    then: (onfulfilled: (value: unknown) => unknown) =>
      Promise.resolve(result).then(onfulfilled),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.status.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
}

function mockCurrentMeetingContext() {
  const recording = query({ data: { id: "recording" }, error: null });
  const intelligence = query({ data: null, error: null });
  const actionItems = query({ data: [], error: null });
  const transcript = query({
    data: { content: "当前会议转录内容" },
    error: null,
  });
  mocks.createClient.mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "recordings") return recording;
      if (table === "meeting_intelligence") return intelligence;
      if (table === "action_items") return actionItems;
      if (table === "transcripts") return transcript;
      throw new Error(`Unexpected table: ${table}`);
    }),
  });
}

describe("formatMeetingCopilotContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("builds a bounded prompt context from transcript, intelligence, and action items", () => {
    const context = formatMeetingCopilotContext({
      transcript: "本次会议确认本周发布。",
      summary: "确认发布范围和验收责任。",
      decisions: ["本周发布"],
      actionItems: [{ title: "完成验收", owner: "李明", status: "open" }],
      risks: ["验收尚未完成"],
    });

    expect(context).toContain("会议转录\n本次会议确认本周发布。");
    expect(context).toContain("会议摘要\n确认发布范围和验收责任。");
    expect(context).toContain("关键决策\n- 本周发布");
    expect(context).toContain("行动项\n- 完成验收（李明，待处理）");
    expect(context).toContain("风险\n- 验收尚未完成");
  });

  it("returns a safe empty context for a meeting without generated data", () => {
    expect(
      formatMeetingCopilotContext({
        transcript: null,
        summary: null,
        decisions: [],
        actionItems: [],
        risks: [],
      }),
    ).toBe("暂无可用会议上下文。");
  });
});

describe("buildMeetingCopilotContext", () => {
  it("retrieves historical chunks for a user question and appends them to context", async () => {
    mockCurrentMeetingContext();
    mocks.retrieveMeetingContext.mockResolvedValue([
      {
        content: "历史会议明确了发布风险。",
        metadata: {},
        meetingId: "historical-meeting",
        similarity: 0.9,
      },
    ]);

    const context = await buildMeetingCopilotContext({
      meetingId: "current-meeting",
      userId: "owner",
      question: "此前如何讨论发布风险？",
    });

    expect(mocks.retrieveMeetingContext).toHaveBeenCalledWith({
      question: "此前如何讨论发布风险？",
    });
    expect(context).toContain("当前会议转录内容");
    expect(context).toContain("历史会议来源");
    expect(context).toContain("[historical-meeting] 历史会议明确了发布风险。");
  });

  it("uses the current meeting context when the knowledge base is empty", async () => {
    mockCurrentMeetingContext();
    mocks.retrieveMeetingContext.mockResolvedValue([]);

    const context = await buildMeetingCopilotContext({
      meetingId: "current-meeting",
      userId: "owner",
      question: "此前如何讨论发布风险？",
    });

    expect(context).toContain("当前会议转录内容");
    expect(context).not.toContain("历史会议来源");
  });

  it("uses the current meeting context when retrieval throws", async () => {
    mockCurrentMeetingContext();
    mocks.retrieveMeetingContext.mockRejectedValue(new Error("retrieval failure"));

    const context = await buildMeetingCopilotContext({
      meetingId: "current-meeting",
      userId: "owner",
      question: "此前如何讨论发布风险？",
    });

    expect(context).toContain("当前会议转录内容");
    expect(context).not.toContain("历史会议来源");
  });
});
