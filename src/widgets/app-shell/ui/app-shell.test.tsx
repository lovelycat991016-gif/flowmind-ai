import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

function renderShell() {
  return render(
    <AppShell
      userActions={<button type="button">Sign out</button>}
      userEmail="alex@flowmind.ai"
    >
      <h1>Dashboard content</h1>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders the approved navigation hierarchy", () => {
    renderShell();

    const navigation = screen.getAllByRole("navigation", {
      name: "Primary",
    })[0]!;
    expect(navigation).toHaveTextContent("Dashboard");
    expect(navigation).toHaveTextContent("Meetings");
    expect(navigation).toHaveTextContent("Summaries");
    expect(navigation).toHaveTextContent("Action Items");
    expect(navigation).toHaveTextContent("Settings");
    expect(
      screen.getAllByRole("link", { name: "Dashboard" })[0],
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks reserved navigation and header utilities unavailable", () => {
    renderShell();

    expect(
      screen.getAllByRole("button", { name: "Summaries" })[0],
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Action Items" })[0],
    ).toBeDisabled();
    expect(
      screen.getByRole("searchbox", { name: "Search meetings" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeDisabled();
  });

  it("shows the authenticated identity in the user menu", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
    expect(screen.getByText("alex@flowmind.ai")).toBeInTheDocument();
    expect(screen.getByRole("menu", { name: "User menu" })).toBeVisible();
  });

  it("opens and closes the mobile navigation with focus return", () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: "Open navigation" });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Navigation" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps keyboard focus inside the mobile navigation dialog", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const dashboardLink = screen.getAllByRole("link", {
      name: "Dashboard",
    })[1]!;
    const closeButton = screen.getByRole("button", {
      name: "Close navigation",
    });

    closeButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(dashboardLink).toHaveFocus();

    dashboardLink.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(closeButton).toHaveFocus();
  });

  it("keeps the compact navigation rail through the tablet breakpoint", () => {
    const { container } = renderShell();

    expect(container.querySelector("aside")).toHaveClass("xl:w-60");
    expect(container.querySelector("main")).toHaveClass("xl:pl-60");
    expect(container.querySelector(":scope > div > header")).toHaveClass(
      "xl:left-60",
    );
  });
});
