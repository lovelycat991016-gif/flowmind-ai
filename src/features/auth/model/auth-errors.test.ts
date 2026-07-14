import { describe, expect, it } from "vitest";

import { mapAuthError } from "./auth-errors";

describe("mapAuthError", () => {
  it.each([
    ["Invalid login credentials", "Email or password is incorrect."],
    ["Email not confirmed", "Confirm your email before signing in."],
    ["User already registered", "An account already exists for this email."],
    [
      "Password should be at least 8 characters",
      "Password must be at least 8 characters.",
    ],
  ])("maps %s to a safe message", (providerMessage, expected) => {
    expect(mapAuthError(providerMessage)).toBe(expected);
  });

  it("does not expose an unknown provider error", () => {
    expect(mapAuthError("database connection string leaked")).toBe(
      "Authentication failed. Please try again.",
    );
  });
});
