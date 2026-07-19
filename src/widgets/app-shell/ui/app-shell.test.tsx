import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/meetings" }));

function renderShell() {
  return render(
    <AppShell
      userActions={<button type="button">退出登录</button>}
      userEmail="alex@flowmind.ai"
    >
      <h1>工作台内容</h1>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders the approved navigation hierarchy", () => {
    renderShell();

    const navigation = screen.getAllByRole("navigation", {
      name: "工作区",
    })[0]!;
    expect(navigation).toHaveTextContent("工作台");
    expect(navigation).toHaveTextContent("会议");
    expect(navigation).toHaveTextContent("摘要");
    expect(navigation).toHaveTextContent("行动项");
    expect(navigation).toHaveTextContent("设置");
    expect(screen.getAllByRole("link", { name: "会议" })[0]).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getAllByRole("link", { name: "工作台" })[0],
    ).not.toHaveAttribute("aria-current");
  });

  it("marks reserved navigation and header utilities unavailable", () => {
    renderShell();

    expect(screen.getAllByRole("button", { name: "摘要" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "行动项" })[0]).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "搜索会议" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "通知" })).toBeDisabled();
  });

  it("shows the authenticated identity in the user menu", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "打开用户菜单" }));
    expect(screen.getByText("alex@flowmind.ai")).toBeInTheDocument();
    expect(screen.getByRole("menu", { name: "打开用户菜单" })).toBeVisible();
  });

  it("opens and closes the mobile navigation with focus return", () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: "打开导航" });

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "工作区" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "工作区" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps keyboard focus inside the mobile navigation dialog", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "打开导航" }));

    const dashboardLink = screen.getAllByRole("link", {
      name: "工作台",
    })[1]!;
    const closeButton = screen.getByRole("button", {
      name: "关闭导航",
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
