import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("presents the AI meeting workflow and registration call to action", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "让会议从记录工具变成可持续利用的知识资产。",
      }),
    ).toBeVisible();
    expect(screen.getByText("AI 会议助手")).toBeVisible();
    expect(screen.getByText("自动转录")).toBeVisible();
    expect(screen.getByText("AI 摘要")).toBeVisible();
    expect(screen.getByText("行动项管理")).toBeVisible();
    expect(screen.getAllByText("会议 Copilot").length).toBeGreaterThan(0);

    screen
      .getAllByRole("link", { name: "免费开始使用" })
      .forEach((link) => expect(link).toHaveAttribute("href", "/signup"));
    screen
      .getAllByRole("link", { name: "登录" })
      .forEach((link) => expect(link).toHaveAttribute("href", "/login"));
  });

  it("uses semantic workflow steps that remain readable on mobile", () => {
    render(<LandingPage />);

    const workflow = screen.getByRole("list", { name: "使用流程" });
    expect(within(workflow).getAllByRole("listitem")).toHaveLength(3);
  });
});
