import { describe, expect, it } from "vitest";

import { mapAuthError } from "./auth-errors";

describe("mapAuthError", () => {
  it.each([
    ["Invalid login credentials", "邮箱或密码不正确。"],
    ["Email not confirmed", "请先验证邮箱后再登录。"],
    ["User already registered", "该邮箱已注册账号。"],
    ["Password should be at least 8 characters", "密码长度至少为 8 个字符。"],
    ["Token has expired or is invalid", "验证码无效或已过期，请重新获取。"],
    ["Email rate limit exceeded", "验证码发送过于频繁，请稍后再试。"],
  ])("maps %s to a safe message", (providerMessage, expected) => {
    expect(mapAuthError(providerMessage)).toBe(expected);
  });

  it("does not expose an unknown provider error", () => {
    expect(mapAuthError("database connection string leaked")).toBe(
      "身份验证失败，请重试。",
    );
  });
});
