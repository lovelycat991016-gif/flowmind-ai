import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardView } from "./dashboard-view";

describe("DashboardView", () => {
  it("renders the approved welcome and dashboard hierarchy", () => {
    render(<DashboardView userName="Alex" data={data} />);

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

  it("renders four query-derived meeting statistics", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const statistics = screen.getAllByTestId("statistic-card");

    expect(statistics).toHaveLength(4);
    expect(statistics.map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("12Total meetings"),
        expect.stringContaining("8Active meetings"),
        expect.stringContaining("4Archived meetings"),
        expect.stringContaining("3Meetings this week"),
      ]),
    );
  });

  it("renders query-derived active recent meetings", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const list = screen.getByRole("list", { name: "Recent meetings" });
    const rows = within(list).getAllByTestId("meeting-row");

    expect(rows).toHaveLength(1);
    expect(within(list).getByText("Product weekly")).toBeVisible();
    expect(within(list).getByText(/Jul 17, 2026/i)).toBeVisible();
  });

  it("provides meeting quick actions", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const quickActions = screen
      .getByRole("heading", { level: 2, name: "Quick actions" })
      .closest("section")!;

    expect(
      within(quickActions).getByRole("link", { name: /New meeting/ }),
    ).toHaveAttribute("href", "/meetings/new");
    expect(
      within(quickActions).getByRole("link", { name: /View meetings/ }),
    ).toHaveAttribute("href", "/meetings");
  });
});

const data = {
  metrics: { total: 12, active: 8, archived: 4, thisWeek: 3 },
  recentMeetings: [
    {
      id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
      title: "Product weekly",
      meetingDate: "2026-07-17T01:30:00.000Z",
      archivedAt: null,
      createdAt: "2026-07-17T01:00:00.000Z",
      updatedAt: "2026-07-17T01:00:00.000Z",
    },
  ],
};
