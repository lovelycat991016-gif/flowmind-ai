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
  createActionItemFromIntelligenceAction,
  completeActionItemAction,
  updateActionItemStatusAction,
} from "./action-item-actions";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";
const intelligenceId = "2c15dfe2-ea8c-420e-85ad-e85901974931";
const actionItemId = "911a4a76-8622-49c9-b3d1-a07c55514f91";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function query(result: unknown) {
  const value = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  return value;
}

beforeEach(() => vi.clearAllMocks());

describe("action item actions", () => {
  it("creates an owner task from a completed intelligence action item", async () => {
    const meeting = query({
      data: { id: meetingId, archived_at: null },
      error: null,
    });
    const intelligence = query({
      data: {
        id: intelligenceId,
        result: {
          provider: "mock",
          modelIdentifier: "mock-v1",
          promptVersion: "meeting_intelligence/v1",
          summary: { content: "会议摘要" },
          keyPoints: [],
          actionItems: [
            {
              content: "完成验收",
              assigneeName: "李明",
              dueDate: "2026-07-30",
              sourceSegmentIndex: null,
            },
          ],
          decisions: [],
          risks: [],
          outputMetadata: {},
        },
      },
      error: null,
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "meetings") return meeting;
        if (table === "meeting_intelligence") return intelligence;
        return { insert };
      }),
    });

    await expect(
      createActionItemFromIntelligenceAction(
        form({ meetingId, intelligenceId, actionItemIndex: "0" }),
      ),
    ).resolves.toEqual({ status: "success" });

    expect(insert).toHaveBeenCalledWith({
      meeting_id: meetingId,
      user_id: "owner",
      title: "完成验收",
      description: null,
      owner: "李明",
      priority: "medium",
      status: "open",
      due_date: "2026-07-30",
      source_intelligence_id: intelligenceId,
      source_action_item_index: 0,
    });
  });

  it("completes only the owner task on an active meeting", async () => {
    const task = query({
      data: {
        id: actionItemId,
        status: "open",
        meetings: { archived_at: null },
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi
        .fn()
        .mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === "action_items" ? { ...task, update } : task,
        ),
    });

    await expect(
      completeActionItemAction(form({ meetingId, actionItemId })),
    ).resolves.toEqual({ status: "success" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("updates an owner task through a valid lifecycle transition", async () => {
    const task = query({
      data: {
        id: actionItemId,
        status: "open",
        meetings: { archived_at: null },
      },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockImplementation((table: string) =>
          table === "action_items" ? { ...task, update } : task,
        ),
    });

    await expect(
      updateActionItemStatusAction(
        form({ meetingId, actionItemId, status: "in_progress" }),
      ),
    ).resolves.toEqual({ status: "success" });

    expect(update).toHaveBeenCalledWith({ status: "in_progress" });
  });
});
