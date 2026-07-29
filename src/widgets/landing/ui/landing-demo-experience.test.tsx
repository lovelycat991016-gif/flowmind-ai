import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "./landing-page";

describe("LandingPage Demo experience", () => {
  it("leads with product value and guides visitors through the static Demo", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "让会议从记录工具变成可持续利用的知识资产。",
      }),
    ).toBeVisible();
    screen
      .getAllByRole("link", { name: "查看 Demo" })
      .forEach((link) => expect(link).toHaveAttribute("href", "#demo-case"));

    const navigation = screen.getByRole("navigation", { name: "Demo 导览" });
    expect(
      within(navigation).getByRole("link", { name: "会议智能分析" }),
    ).toHaveAttribute("href", "#demo-intelligence");
    expect(
      within(navigation).getByRole("link", { name: "向 Copilot 提问" }),
    ).toHaveAttribute("href", "#demo-copilot");
    expect(
      within(navigation).getByRole("link", { name: "查看来源引用" }),
    ).toHaveAttribute("href", "#demo-sources");
  });

  it("shows source references and explains the no-knowledge fallback without fabricating sources", () => {
    render(<LandingPage />);

    const sources = screen.getByRole("list", { name: "来源引用" });
    expect(within(sources).getAllByRole("listitem")).toHaveLength(3);
    expect(within(sources).getByText("风险讨论会议")).toBeVisible();

    const fallback = screen.getByRole("complementary", { name: "知识库不可用" });
    expect(
      within(fallback).getByText("Copilot 将仅基于当前会议上下文回答。"),
    ).toBeVisible();
    expect(within(fallback).queryByRole("list")).toBeNull();
  });

  it("explains the three product layers without exposing sensitive AI internals", () => {
    const { container } = render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: "AI Workflow" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Knowledge Pipeline" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Reliability Layer" }),
    ).toBeVisible();

    const presentation = container.textContent ?? "";
    expect(presentation).not.toMatch(
      /API[_ ]?KEY|provider_timeout|similarity|0\.9[0-9]/i,
    );
  });
});
