import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { GET } from "./route";

describe("auth callback", () => {
  it("exchanges a valid password-reset callback code", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    });
    const response = await GET({
      nextUrl: new URL(
        "http://localhost/auth/callback?code=code&next=/reset-password",
      ),
      url: "http://localhost/auth/callback?code=code&next=/reset-password",
    } as never);
    expect(response.headers.get("location")).toBe(
      "http://localhost/reset-password",
    );
  });

  it("exchanges a verified signup callback code before redirecting to the dashboard", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });

    const response = await GET({
      nextUrl: new URL(
        "http://localhost/auth/callback?code=code&next=/dashboard",
      ),
      url: "http://localhost/auth/callback?code=code&next=/dashboard",
    } as never);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("code");
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
