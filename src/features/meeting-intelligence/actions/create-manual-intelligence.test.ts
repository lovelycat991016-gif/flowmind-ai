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
  INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
  createManualIntelligenceAction,
} from "./create-manual-intelligence";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function meetingQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockReset();
});

describe("createManualIntelligenceAction", () => {
  it("creates an owner-scoped queued intelligence task for valid meeting text", async () => {
    const meeting = meetingQuery({
      data: { id: meetingId, archived_at: null },
      error: null,
    });
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: "job" }, error: null });
    const insert = vi
      .fn()
      .mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
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
      createManualIntelligenceAction(
        INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
        form({ meetingId, inputText: "  讨论发布计划。  " }),
      ),
    ).resolves.toMatchObject({ status: "success" });

    expect(insert).toHaveBeenCalledWith({
      meeting_id: meetingId,
      user_id: "owner",
      input_text: "讨论发布计划。",
      status: "queued",
      attempt_count: 0,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/meetings/${meetingId}`);
  });

  it("rejects archived meetings without creating a task", async () => {
    const meeting = meetingQuery({
      data: { id: meetingId, archived_at: "2026-07-25T00:00:00.000Z" },
      error: null,
    });
    const insert = vi.fn();
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
      createManualIntelligenceAction(
        INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
        form({ meetingId, inputText: "会议内容" }),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("hides an inaccessible meeting and does not create a task", async () => {
    const meeting = meetingQuery({ data: null, error: null });
    const insert = vi.fn();
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
      createManualIntelligenceAction(
        INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
        form({ meetingId, inputText: "会议内容" }),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("validates input before calling Supabase", async () => {
    await expect(
      createManualIntelligenceAction(
        INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
        form({ meetingId, inputText: " " }),
      ),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
