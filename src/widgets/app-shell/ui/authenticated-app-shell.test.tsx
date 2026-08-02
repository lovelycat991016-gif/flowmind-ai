import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./app-shell", () => ({
  AppShell: ({
    children,
    userEmail,
  }: {
    children: React.ReactNode;
    userEmail: string;
  }) => <div data-user-email={userEmail}>{children}</div>,
}));
vi.mock("@/features/auth/ui/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
}));

import { AuthenticatedAppShell } from "./authenticated-app-shell";

describe("AuthenticatedAppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not issue a second login redirect when middleware already admitted a newly signed-in request", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    render(await AuthenticatedAppShell({ children: <p>Dashboard content</p> }));

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(screen.getByText("Dashboard content")).toBeVisible();
    expect(screen.getByText("Dashboard content").parentElement).toHaveAttribute(
      "data-user-email",
      "FlowMind user",
    );
  });
});
