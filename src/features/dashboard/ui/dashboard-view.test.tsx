import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardView } from "./dashboard-view";

describe("DashboardView", () => {
  it("renders the approved welcome and dashboard hierarchy", () => {
    render(<DashboardView userName="Alex" data={data} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "早上好，Alex" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "最近会议" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "快捷操作" }),
    ).toBeVisible();
  });

  it("renders four query-derived meeting statistics", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const statistics = screen.getAllByTestId("statistic-card");

    expect(statistics).toHaveLength(4);
    expect(statistics.map((card) => card.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("12全部会议"),
        expect.stringContaining("8进行中的会议"),
        expect.stringContaining("4已归档会议"),
        expect.stringContaining("3本周会议"),
      ]),
    );
  });

  it("renders query-derived active recent meetings", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const list = screen.getByRole("list", { name: "最近会议" });
    const rows = within(list).getAllByTestId("meeting-row");

    expect(rows).toHaveLength(1);
    expect(within(list).getByText("Product weekly")).toBeVisible();
    expect(within(list).getByText(/2026年7月17日/)).toBeVisible();
  });

  it("provides meeting quick actions", () => {
    render(<DashboardView userName="Alex" data={data} />);
    const quickActions = screen
      .getByRole("heading", { level: 2, name: "快捷操作" })
      .closest("section")!;

    expect(
      within(quickActions).getByRole("link", { name: /新建会议/ }),
    ).toHaveAttribute("href", "/meetings/new");
    expect(
      within(quickActions).getByRole("link", { name: /查看会议/ }),
    ).toHaveAttribute("href", "/meetings");
  });

  it("shows onboarding only before the user has created a meeting", () => {
    const { rerender } = render(
      <DashboardView
        userName="Alex"
        data={{
          metrics: { total: 0, active: 0, archived: 0, thisWeek: 0 },
          recentMeetings: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "开始使用 FlowMind" }),
    ).toBeVisible();

    rerender(<DashboardView userName="Alex" data={data} />);

    expect(
      screen.queryByRole("heading", { level: 2, name: "开始使用 FlowMind" }),
    ).not.toBeInTheDocument();
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
