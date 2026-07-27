import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

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
});

describe("sendMeetingCopilotMessageAction", () => {
  it("persists an owner prompt and deterministic assistant response", async () => {
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
});
