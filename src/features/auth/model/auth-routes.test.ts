import { describe, expect, it } from "vitest";

import { getAuthRedirect, getSafeInternalPath } from "./auth-routes";

describe("getAuthRedirect", () => {
  it("sends an anonymous dashboard request to login with a return path", () => {
    expect(
      getAuthRedirect({ pathname: "/dashboard", isAuthenticated: false }),
    ).toBe("/login?next=%2Fdashboard");
  });

  it("allows an authenticated dashboard request", () => {
    expect(
      getAuthRedirect({ pathname: "/dashboard", isAuthenticated: true }),
    ).toBeNull();
  });

  it("sends an authenticated user away from login", () => {
    expect(getAuthRedirect({ pathname: "/login", isAuthenticated: true })).toBe(
      "/dashboard",
    );
  });

  it("allows public callback and password recovery routes", () => {
    expect(
      getAuthRedirect({ pathname: "/auth/callback", isAuthenticated: false }),
    ).toBeNull();
    expect(
      getAuthRedirect({ pathname: "/forgot-password", isAuthenticated: false }),
    ).toBeNull();
    expect(
      getAuthRedirect({ pathname: "/reset-password", isAuthenticated: false }),
    ).toBeNull();
  });
});

describe("getSafeInternalPath", () => {
  it("keeps a local application path", () => {
    expect(getSafeInternalPath("/dashboard")).toBe("/dashboard");
  });

  it.each([
    null,
    "https://malicious.example",
    "//malicious.example",
    "dashboard",
  ])("falls back to the dashboard for %s", (value) => {
    expect(getSafeInternalPath(value)).toBe("/dashboard");
  });
});
