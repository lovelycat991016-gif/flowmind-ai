import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/shared/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { GET } from "./route";

describe("auth callback", () => {
  it("exchanges a valid code and rejects an external next destination", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
    });
    const response = await GET({
      nextUrl: new URL(
        "http://localhost/auth/callback?code=code&next=https://bad.example",
      ),
      url: "http://localhost/auth/callback?code=code&next=https://bad.example",
    } as never);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
