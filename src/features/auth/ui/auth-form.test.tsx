import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("renders accessible login controls", () => {
    render(
      <AuthForm
        action={vi.fn(async () => ({
          status: "success" as const,
          message: "Signed in.",
        }))}
        mode="login"
      />,
    );

    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows a safe server error after submission", async () => {
    const action = vi.fn(async () => ({
      status: "error" as const,
      message: "Email or password is incorrect.",
    }));

    render(<AuthForm action={action} mode="login" />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "incorrect-password" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Sign in" }).closest("form")!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(action).toHaveBeenCalledOnce();
  });

  it("renders password confirmation for sign-up", () => {
    render(
      <AuthForm
        action={vi.fn(async () => ({
          status: "success" as const,
          message: "Check email.",
        }))}
        mode="signup"
      />,
    );

    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});
