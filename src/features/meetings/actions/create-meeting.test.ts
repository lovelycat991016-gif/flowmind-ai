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

import { INITIAL_MEETING_ACTION_STATE } from "./meeting-action-state";
import { createMeetingAction } from "./create-meeting";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMeetingAction", () => {
  it("returns field-safe validation errors and preserves input", async () => {
    const state = await createMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({ title: " ", meetingDateLocal: "", timezoneOffset: "-480" }),
    );

    expect(state.status).toBe("error");
    expect(state.fieldErrors.title).toBeDefined();
    expect(state.values).toMatchObject({ meetingDateLocal: "", title: " " });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("inserts only approved fields and redirects to detail", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "6b79f5f3-f083-4a75-b74b-41342f2b1454" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi.fn().mockReturnValue({ insert }),
    });

    await createMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({
        title: " Product weekly ",
        meetingDateLocal: "2026-07-17T09:30",
        timezoneOffset: "-480",
      }),
    );

    expect(insert).toHaveBeenCalledWith({
      title: "Product weekly",
      meeting_date: "2026-07-17T01:30:00.000Z",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/meetings");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/meetings/6b79f5f3-f083-4a75-b74b-41342f2b1454",
    );
  });

  it("returns a generic error without exposing Supabase details", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "secret detail" },
            }),
          }),
        }),
      }),
    });

    const state = await createMeetingAction(
      INITIAL_MEETING_ACTION_STATE,
      form({
        title: "Planning",
        meetingDateLocal: "2026-07-17T09:30",
        timezoneOffset: "0",
      }),
    );

    expect(state.message).toBe("暂时无法创建会议，请重试。");
    expect(state.message).not.toContain("secret detail");
  });
});
