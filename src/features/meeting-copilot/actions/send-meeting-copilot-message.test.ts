import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  createProvider: vi.fn(),
  buildContext: vi.fn(),
  retrieveSources: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock(
  "@/features/ai-providers/factory/create-meeting-copilot-provider",
  () => ({ createMeetingCopilotProvider: mocks.createProvider }),
);
vi.mock(
  "@/features/meeting-copilot/context/build-meeting-copilot-context",
  () => ({
    buildMeetingCopilotContext: mocks.buildContext,
    retrieveMeetingCopilotSources: mocks.retrieveSources,
  }),
);

import {
  INITIAL_MEETING_COPILOT_ACTION_STATE,
  sendMeetingCopilotMessageAction,
} from "./send-meeting-copilot-message";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

function form(prompt: string) {
  const data = new FormData();
  data.set("meetingId", meetingId);
  data.set("prompt", prompt);
  return data;
}

function meetingQuery(result: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buildContext.mockResolvedValue("会议摘要\n确认发布范围");
  mocks.retrieveSources.mockResolvedValue([]);
});

describe("sendMeetingCopilotMessageAction", () => {
  it("persists an owner prompt and provider response with owner-scoped context", async () => {
    const meeting = meetingQuery({
      data: { id: meetingId, title: "产品周会", archived_at: null },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === "meetings" ? meeting : { insert },
        ),
    });
    const provider = {
      generate: vi
        .fn()
        .mockResolvedValue({ content: "模拟回答", provider: "mock" }),
    };

    await expect(
      sendMeetingCopilotMessageAction(
        INITIAL_MEETING_COPILOT_ACTION_STATE,
        form("  总结一下这次会议  "),
        provider,
      ),
    ).resolves.toMatchObject({ status: "success", value: "" });

    expect(insert).toHaveBeenNthCalledWith(1, {
      meeting_id: meetingId,
      user_id: "owner",
      role: "user",
      content: "总结一下这次会议",
    });
    expect(insert).toHaveBeenNthCalledWith(2, {
      meeting_id: meetingId,
      user_id: "owner",
      role: "assistant",
      content: "模拟回答",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/meetings/${meetingId}`);
    expect(mocks.buildContext).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId,
        userId: "owner",
        question: "总结一下这次会议",
      }),
    );
    expect(provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({ context: "会议摘要\n确认发布范围" }),
    );
  });

  it("returns temporary knowledge sources with only the current successful response", async () => {
    const meeting = meetingQuery({
      data: { id: meetingId, title: "产品周会", archived_at: null },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }) },
      from: vi.fn((table: string) => (table === "meetings" ? meeting : { insert })),
    });
    mocks.retrieveSources.mockResolvedValue([
      {
        meetingId: "historical-meeting",
        title: "风险讨论会议",
        meetingDate: "2026-07-28",
        content: "上线依赖尚未完成验收。",
        metadata: {},
      },
    ]);

    await expect(
      sendMeetingCopilotMessageAction(
        INITIAL_MEETING_COPILOT_ACTION_STATE,
        form("总结风险"),
        { generate: vi.fn().mockResolvedValue({ content: "请关注验收依赖。", provider: "mock" }) },
      ),
    ).resolves.toMatchObject({
      status: "success",
      sources: [{ meetingId: "historical-meeting", title: "风险讨论会议" }],
    });
    expect(mocks.retrieveSources).toHaveBeenCalledWith({ question: "总结风险", userId: "owner" });
    expect(insert).toHaveBeenNthCalledWith(2, expect.not.objectContaining({ sources: expect.anything() }));
  });

  it("rejects archived or inaccessible meetings without writing messages", async () => {
    const insert = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === "meetings"
            ? meetingQuery({ data: null, error: null })
            : { insert },
        ),
    });

    await expect(
      sendMeetingCopilotMessageAction(
        INITIAL_MEETING_COPILOT_ACTION_STATE,
        form("总结一下这次会议"),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps the owner prompt and returns a safe error when AI generation fails", async () => {
    const meeting = meetingQuery({
      data: { id: meetingId, title: "产品周会", archived_at: null },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === "meetings" ? meeting : { insert },
        ),
    });

    await expect(
      sendMeetingCopilotMessageAction(
        INITIAL_MEETING_COPILOT_ACTION_STATE,
        form("总结一下这次会议"),
        { generate: vi.fn().mockRejectedValue(new Error("provider secret")) },
      ),
    ).resolves.toMatchObject({ status: "error" });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      meeting_id: meetingId,
      user_id: "owner",
      role: "user",
      content: "总结一下这次会议",
    });
  });
});
