import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  requestSignupEmailVerificationAction,
  resendSignupEmailVerificationAction,
  verifySignupEmailOtpAction,
} from "./auth-actions";
import { zhCN } from "@/shared/i18n/zh-CN";

function formData(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("signup email OTP actions", () => {
  it("creates a signup verification request from valid email and password input", async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { signUp } });

    await expect(
      requestSignupEmailVerificationAction(
        { status: "idle", message: "" },
        formData({
          email: " USER@Example.com ",
          password: "secure-passphrase",
          confirmPassword: "secure-passphrase",
        }),
      ),
    ).resolves.toEqual({ status: "success", message: zhCN.auth.otpCodeSent });
    expect(signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secure-passphrase",
    });
  });

  it("verifies a signup OTP", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifySignupEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "123456" }),
      ),
    ).resolves.toEqual({ status: "success", message: zhCN.auth.otpVerified });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      token: "123456",
      type: "signup",
    });
  });

  it("returns the mapped invalid or expired signup OTP error", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      error: { message: "Token has expired or is invalid" },
    });
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifySignupEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "123456" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpCodeInvalid });
  });

  it("uses non-creating semantics when resending a verification code", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { signInWithOtp } });

    await expect(
      resendSignupEmailVerificationAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com" }),
      ),
    ).resolves.toEqual({ status: "success", message: zhCN.auth.otpCodeSent });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { shouldCreateUser: false },
    });
  });

  it("returns the mapped OTP rate-limit error", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({
      error: { message: "Email rate limit exceeded" },
    });
    mocks.createClient.mockResolvedValue({ auth: { signInWithOtp } });

    await expect(
      resendSignupEmailVerificationAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpRateLimited });
  });

  it("rejects invalid OTP input before calling Supabase", async () => {
    const verifyOtp = vi.fn();
    mocks.createClient.mockResolvedValue({ auth: { verifyOtp } });

    await expect(
      verifySignupEmailOtpAction(
        { status: "idle", message: "" },
        formData({ email: "user@example.com", token: "12345" }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.otpCodeInvalid });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("does not expose an unexpected provider failure", async () => {
    const signUp = vi.fn().mockResolvedValue({
      error: { message: "provider secret leaked" },
    });
    mocks.createClient.mockResolvedValue({ auth: { signUp } });

    await expect(
      requestSignupEmailVerificationAction(
        { status: "idle", message: "" },
        formData({
          email: "user@example.com",
          password: "secure-passphrase",
          confirmPassword: "secure-passphrase",
        }),
      ),
    ).resolves.toEqual({ status: "error", message: zhCN.auth.authFailed });
  });
});
