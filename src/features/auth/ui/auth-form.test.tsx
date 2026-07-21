import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("renders accessible login controls", () => {
    render(
      <AuthForm
        action={vi.fn(async () => ({
          status: "success" as const,
          message: "登录成功。",
        }))}
        mode="login"
      />,
    );

    expect(screen.getByLabelText("邮箱地址")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("密码")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "登录" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "忘记密码？" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("shows a safe server error after submission", async () => {
    const action = vi.fn(async () => ({
      status: "error" as const,
      message: "邮箱或密码不正确。",
    }));

    render(<AuthForm action={action} mode="login" />);
    fireEvent.change(screen.getByLabelText("邮箱地址"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("密码"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "登录" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "邮箱或密码不正确。",
    );
    expect(action).toHaveBeenCalledOnce();
  });

  it("renders signup credentials and an accessible verification-code request action", () => {
    render(
      <AuthForm
        action={vi.fn(async () => ({
          status: "success" as const,
          message: "请查收邮件。",
        }))}
        mode="signup"
      />,
    );

    expect(screen.getByLabelText("确认密码")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeEnabled();
  });

  it("shows safe signup verification request feedback", async () => {
    const action = vi.fn(async () => ({
      status: "success" as const,
      message: "如果该邮箱可用，我们已发送验证码。",
    }));

    render(<AuthForm action={action} mode="signup" />);
    fireEvent.submit(
      screen.getByRole("button", { name: "发送验证码" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "如果该邮箱可用，我们已发送验证码。",
    );
  });
});
