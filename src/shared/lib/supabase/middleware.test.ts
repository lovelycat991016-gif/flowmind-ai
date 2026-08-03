import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  nextResponse: vi.fn(),
  redirectResponse: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("next/server", () => ({
  NextResponse: {
    next: mocks.nextResponse,
    redirect: mocks.redirectResponse,
  },
}));
vi.mock("@/shared/config/env", () => ({
  getPublicEnv: () => ({
    supabaseAnonKey: "anon-key",
    supabaseUrl: "https://project.supabase.co",
  }),
}));

import { updateSession } from "./middleware";

function dashboardRequest() {
  const url = new URL("https://flowmind.example/dashboard");
  return {
    cookies: { getAll: () => [] },
    nextUrl: url,
    url: url.toString(),
  } as never;
}

function response(status = 200) {
  return {
    cookies: { getAll: () => [], set: vi.fn() },
    headers: new Headers(),
    status,
  };
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DASHBOARD_PREVIEW", "");
    mocks.nextResponse.mockImplementation(() => response());
    mocks.redirectResponse.mockImplementation((url: URL) => {
      const redirect = response(307);
      redirect.headers.set("location", url.toString());
      return redirect;
    });
  });

  it("redirects a dashboard request to login after logout leaves no session", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const response = await updateSession(dashboardRequest());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://flowmind.example/login?next=%2Fdashboard",
    );
  });

  it("allows a dashboard refresh while the Supabase session remains valid", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "demo-user" } },
        }),
      },
    });

    const response = await updateSession(dashboardRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
