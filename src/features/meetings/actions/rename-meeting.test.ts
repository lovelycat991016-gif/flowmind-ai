import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { INITIAL_MEETING_ACTION_STATE } from "./meeting-action-state";
import { renameMeetingAction } from "./rename-meeting";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("renameMeetingAction", () => {
  it("returns a title error without making a database call", async () => {
    const state = await renameMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({ id: meetingId, title: " " }),
    );

    expect(state.fieldErrors.title).toBe("Enter a meeting title.");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("updates only the validated title and revalidates meeting views", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: { id: meetingId }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi.fn().mockReturnValue({ update }),
    });

    const state = await renameMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({ id: meetingId, title: "  Product review  " }),
    );

    expect(update).toHaveBeenCalledWith({ title: "Product review" });
    expect(eq).toHaveBeenCalledWith("id", meetingId);
    expect(state.status).toBe("success");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/meetings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/meetings/${meetingId}`);
  });

  it("uses not-found behavior when no owner-visible row is updated", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi
        .fn()
        .mockReturnValue({ update: vi.fn().mockReturnValue({ eq }) }),
    });

    await renameMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({ id: meetingId, title: "Review" }),
    );

    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
