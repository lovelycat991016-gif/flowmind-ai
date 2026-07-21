import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignupOtpVerificationForm } from "./signup-otp-verification-form";

describe("SignupOtpVerificationForm", () => {
  it("renders an accessible six-digit verification input and resend control", () => {
    render(
      <SignupOtpVerificationForm
        email="person@example.com"
        resendAction={vi.fn()}
        verifyAction={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("验证码");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("maxlength", "6");
    expect(screen.getByText("person@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "验证邮箱" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "重新发送验证码" })).toBeEnabled();
  });

  it("submits the six-digit code and keeps the email context", () => {
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
      target: { value: "123456" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "验证邮箱" }).closest("form")!,
    );
    expect(screen.getAllByDisplayValue("person@example.com")).toHaveLength(2);
  });
});
