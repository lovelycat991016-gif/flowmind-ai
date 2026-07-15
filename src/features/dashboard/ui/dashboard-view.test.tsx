import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardView } from "./dashboard-view";

describe("DashboardView", () => {
  it("renders the approved welcome and dashboard hierarchy", () => {
    render(<DashboardView userName="Alex" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Good morning, Alex" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Recent meetings" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Quick actions" }),
    ).toBeVisible();
  });

  it("renders four deterministic statistics", () => {
    render(<DashboardView userName="Alex" />);
    const statistics = screen.getAllByTestId("statistic-card");

    expect(statistics).toHaveLength(4);
    expect(statistics.map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("12Meetings"),
        expect.stringContaining("8.4hTime saved"),
        expect.stringContaining("24Action items"),
        expect.stringContaining("92%Completion rate"),
      ]),
    );
  });

  it("renders four mock recent meetings with readable statuses", () => {
    render(<DashboardView userName="Alex" />);
    const list = screen.getByRole("list", { name: "Recent meetings" });
    const rows = within(list).getAllByTestId("meeting-row");

    expect(rows).toHaveLength(4);
    expect(within(list).getByText("Product weekly")).toBeVisible();
    expect(within(list).getByText("Customer onboarding")).toBeVisible();
    expect(within(list).getByText("Complete")).toBeVisible();
    expect(within(list).getByText("Processing")).toBeVisible();
  });

  it("provides mock quick actions as internal page links", () => {
    render(<DashboardView userName="Alex" />);
    const quickActions = screen
      .getByRole("heading", { level: 2, name: "Quick actions" })
      .closest("section")!;

    expect(
      within(quickActions).getByRole("link", { name: /Upload recording/ }),
    ).toHaveAttribute("href", "#processing-empty");
    expect(
      within(quickActions).getByRole("link", { name: /View meeting history/ }),
    ).toHaveAttribute("href", "#recent-meetings");
    expect(
      within(quickActions).getByRole("link", { name: /Review action items/ }),
    ).toHaveAttribute("href", "#open-action-items");
  });

  it("includes a compact processing empty state", () => {
    render(<DashboardView userName="Alex" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No recordings in progress",
    );
  });
});
