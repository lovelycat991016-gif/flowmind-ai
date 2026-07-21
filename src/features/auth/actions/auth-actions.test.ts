import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
} from "./auth-actions";
import { zhCN } from "@/shared/i18n/zh-CN";

function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("email OTP authentication actions", () => {
  it("requests an OTP with normalized email and self-service beta signup enabled", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { signInWithOtp } });

    await expect(
      requestEmailOtpAction({ status: "idle", message: "" }, formData({ email: " USER@Example.com " })),
    ).resolves.toEqual({ status: "success", message: zhCN.auth.otpCodeSent });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { shouldCreateUser: true },
    });
  });

  it("returns the mapped invalid or expired OTP error", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      error: { message: "Token has expired or is invalid" },
    });
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifyEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "123456" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpCodeInvalid });
  });

  it("returns the mapped OTP rate-limit error", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({
      error: { message: "Email rate limit exceeded" },
    });
    mocks.createClient.mockResolvedValue({ auth: { signInWithOtp } });

    await expect(
      requestEmailOtpAction({ status: "idle", message: "" }, formData({ email: "user@example.com" })),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpRateLimited });
  });

  it("rejects invalid OTP input before calling Supabase", async () => {
    const verifyOtp = vi.fn();
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifyEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "12345" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpCodeInvalid });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("does not expose an unexpected provider failure", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      error: { message: "provider secret leaked" },
    });
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifyEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "123456" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.authFailed });
  });
});
