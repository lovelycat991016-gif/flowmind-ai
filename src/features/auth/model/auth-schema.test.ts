import { describe, expect, it } from "vitest";

import {
  emailOtpRequestSchema,
  emailOtpVerificationSchema,
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./auth-schema";

describe("email OTP schemas", () => {
  it("normalizes an email address for an OTP request", () => {
    expect(
      emailOtpRequestSchema.parse({ email: "  USER@Example.COM " }).email,
    ).toBe("user@example.com");
  });

  it("accepts exactly six ASCII digits for OTP verification", () => {
    expect(
      emailOtpVerificationSchema.parse({
        email: "user@example.com",
        token: "123456",
      }).token,
    ).toBe("123456");
  });

  it.each(["", "12345", "1234567", "１２３４５６", "12 456", "abcdef"])(
    "rejects an invalid OTP token %s",
    (token) => {
      expect(
        emailOtpVerificationSchema.safeParse({
          email: "user@example.com",
          token,
        }).success,
      ).toBe(false);
    },
  );
});

describe("loginSchema", () => {
  it("normalizes a valid email address", () => {
    const result = loginSchema.parse({
      email: "  USER@Example.COM ",
      password: "secure-passphrase",
    });

    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("secure-passphrase");
  });

  it("rejects an invalid email address", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secure-passphrase",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("rejects passwords shorter than eight characters", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a confirmation that does not match", () => {
    const result = signUpSchema.safeParse({
      email: "person@example.com",
      password: "secure-passphrase",
      confirmPassword: "different-passphrase",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});

describe("password recovery schemas", () => {
  it("accepts a normalized recovery email", () => {
    expect(
      forgotPasswordSchema.parse({ email: " PERSON@Example.com " }).email,
    ).toBe("person@example.com");
  });

  it("requires matching new passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "new-secure-password",
      confirmPassword: "another-password",
    });

    expect(result.success).toBe(false);
  });
});
