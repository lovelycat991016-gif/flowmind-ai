import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getMeetingAiMessages } from "./get-meeting-ai-messages";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  meeting_id: meetingId,
  user_id: "22222222-2222-4222-8222-222222222222",
  role: "user",
  content: "总结一下这次会议",
  created_at: "2026-07-27T08:00:00.000Z",
};

function query(result: { data: (typeof row)[]; error: unknown }) {
  const value = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  value.order.mockResolvedValue(result);
  return value;
}

beforeEach(() => createClientMock.mockReset());

describe("getMeetingAiMessages", () => {
  it("returns ordered messages visible to the meeting owner", async () => {
    const messages = query({ data: [row], error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(messages),
    });

    await expect(getMeetingAiMessages(meetingId)).resolves.toEqual([
      {
        id: row.id,
        meetingId,
        role: "user",
        content: row.content,
        createdAt: row.created_at,
      },
    ]);
    expect(messages.eq).toHaveBeenCalledWith("meeting_id", meetingId);
    expect(messages.order).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("returns an empty list when messages are hidden by RLS", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query({ data: [], error: null })),
    });

    await expect(getMeetingAiMessages(meetingId)).resolves.toEqual([]);
  });

  it("throws a safe error for a database failure", async () => {
    createClientMock.mockResolvedValue({
      from: vi
        .fn()
        .mockReturnValue(
          query({ data: [], error: { message: "unsafe detail" } }),
        ),
    });

    await expect(getMeetingAiMessages(meetingId)).rejects.toThrow(
      "Unable to load meeting Copilot messages.",
    );
  });
});
