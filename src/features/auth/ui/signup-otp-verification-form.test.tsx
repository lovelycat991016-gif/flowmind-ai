import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignupOtpVerificationForm } from "./signup-otp-verification-form";
import { zhCN } from "@/shared/i18n/zh-CN";

describe("SignupOtpVerificationForm", () => {
  it("renders an accessible eight-digit verification input and resend control", () => {
    render(
      <SignupOtpVerificationForm
        email="person@example.com"
        resendAction={vi.fn()}
        verifyAction={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("验证码");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("maxlength", "8");
    expect(input).toHaveAttribute("pattern", "[0-9]{8}");
    expect(screen.getByText("person@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "验证邮箱" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "重新发送验证码" })).toBeEnabled();
  });

  it("submits the eight-digit code and keeps the email context", () => {
    const verifyAction = vi.fn(async () => ({
      status: "success" as const,
      message: "验证码验证成功。",
    }));
    render(
      <SignupOtpVerificationForm
        email="person@example.com"
        resendAction={vi.fn(async () => ({ status: "idle" as const, message: "" }))}
        verifyAction={verifyAction}
      />,
    );
    fireEvent.change(screen.getByLabelText("验证码"), {
      target: { value: "12345678" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "验证邮箱" }).closest("form")!,
    );
    expect(screen.getAllByDisplayValue("person@example.com")).toHaveLength(2);
  });

  it("shows a verification error while allowing an eight-digit replacement", async () => {
    const verifyAction = vi.fn(async () => ({
      status: "error" as const,
      message: zhCN.auth.otpCodeInvalid,
    }));
    render(
      <SignupOtpVerificationForm
        email="person@example.com"
        resendAction={vi.fn()}
        verifyAction={verifyAction}
      />,
    );

    const input = screen.getByLabelText(zhCN.auth.otpCode);
    fireEvent.change(input, { target: { value: "123456" } });
    expect(input).toBeInvalid();
    fireEvent.change(input, { target: { value: "12345678" } });
    expect(input).toBeValid();
    fireEvent.submit(
      screen.getByRole("button", { name: zhCN.auth.verifyEmail }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      zhCN.auth.otpCodeInvalid,
    );
    fireEvent.change(input, { target: { value: "87654321" } });
    expect(input).toHaveValue("87654321");
  });
});
