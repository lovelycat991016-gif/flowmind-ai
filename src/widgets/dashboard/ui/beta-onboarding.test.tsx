import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BetaOnboarding } from "./beta-onboarding";

describe("BetaOnboarding", () => {
  it("explains the first-run workflow with an accessible create-meeting action", () => {
    render(<BetaOnboarding />);

    expect(
      screen.getByRole("heading", { level: 2, name: "开始使用 FlowMind" }),
    ).toBeVisible();
    const steps = screen.getByRole("list", { name: "开始使用步骤" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: "创建第一场会议" }),
    ).toHaveAttribute("href", "/meetings/new");
  });
});
