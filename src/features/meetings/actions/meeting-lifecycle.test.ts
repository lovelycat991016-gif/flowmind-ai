import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { archiveMeetingAction } from "./archive-meeting";
import { deleteMeetingAction } from "./delete-meeting";
import { restoreMeetingAction } from "./restore-meeting";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

function form() {
  const data = new FormData();
  data.set("id", meetingId);
  return data;
}

function authenticatedClient(
  method: "update" | "delete",
  result: { data: { id: string } | null; error: null } = {
    data: { id: meetingId },
    error: null,
  },
) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const mutation = vi.fn().mockReturnValue({ eq });
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }),
    },
    from: vi.fn().mockReturnValue({ [method]: mutation }),
  });
  return { mutation, eq };
}

beforeEach(() => vi.clearAllMocks());

describe("meeting lifecycle actions", () => {
  it("archives an owner-visible meeting with a timestamp", async () => {
    const { mutation, eq } = authenticatedClient("update");
    await archiveMeetingAction(form());
    expect(mutation).toHaveBeenCalledWith(
      expect.objectContaining({ archived_at: expect.any(String) }),
    );
    expect(eq).toHaveBeenCalledWith("id", meetingId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("restores an owner-visible meeting by clearing archived_at", async () => {
    const { mutation } = authenticatedClient("update");
    await restoreMeetingAction(form());
    expect(mutation).toHaveBeenCalledWith({ archived_at: null });
  });

  it("permanently deletes an owner-visible meeting and redirects to the list", async () => {
    const { mutation, eq } = authenticatedClient("delete");
    await deleteMeetingAction(form());
    expect(mutation).toHaveBeenCalledWith();
    expect(eq).toHaveBeenCalledWith("id", meetingId);
    expect(mocks.redirect).toHaveBeenCalledWith("/meetings");
  });

  it("uses not-found behavior when RLS makes a lifecycle mutation affect no row", async () => {
    authenticatedClient("update", { data: null, error: null });
    await archiveMeetingAction(form());
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
