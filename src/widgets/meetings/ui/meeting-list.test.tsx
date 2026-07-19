import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MeetingListItem } from "@/entities/meeting/model/meeting";
import { MeetingList } from "./meeting-list";

function meeting(index: number, archived = false): MeetingListItem {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    title: `Meeting ${index}`,
    meetingDate: "2026-07-17T01:30:00.000Z",
    archivedAt: archived ? "2026-07-18T01:30:00.000Z" : null,
    createdAt: "2026-07-17T01:00:00.000Z",
    updatedAt: "2026-07-17T01:00:00.000Z",
  };
}

const activeState = {
  q: "",
  filter: "active",
  sort: "date-desc",
  page: 2,
} as const;

describe("MeetingList", () => {
  it("renders twenty linked meetings and preserves pagination state", () => {
    render(
      <MeetingList
        hasNextPage
        meetings={Array.from({ length: 20 }, (_, index) => meeting(index))}
        state={activeState}
      />,
    );

    expect(screen.getAllByTestId("meeting-list-row")).toHaveLength(20);
    expect(screen.getByRole("link", { name: "Meeting 0" })).toHaveAttribute(
      "href",
      "/meetings/00000000-0000-4000-8000-000000000000",
    );
    expect(screen.getByRole("link", { name: "上一页" })).toHaveAttribute(
      "href",
      expect.not.stringContaining("page=2"),
    );
    expect(screen.getByRole("link", { name: "下一页" })).toHaveAttribute(
      "href",
      expect.stringContaining("page=3"),
    );
  });

  it("marks archived meetings", () => {
    render(
      <MeetingList
        hasNextPage={false}
        meetings={[meeting(1, true)]}
        state={{ ...activeState, filter: "archived" }}
      />,
    );

    expect(screen.getByText("已归档")).toBeVisible();
  });

  it("distinguishes empty lifecycle and search results", () => {
    const { rerender } = render(
      <MeetingList
        hasNextPage={false}
        meetings={[]}
        state={{ ...activeState, page: 1 }}
      />,
    );
    expect(screen.getByText("暂无进行中的会议")).toBeVisible();

    rerender(
      <MeetingList
        hasNextPage={false}
        meetings={[]}
        state={{ ...activeState, filter: "archived", page: 1 }}
      />,
    );
    expect(screen.getByText("暂无已归档会议")).toBeVisible();

    rerender(
      <MeetingList
        hasNextPage={false}
        meetings={[]}
        state={{ ...activeState, q: "missing", page: 1 }}
      />,
    );
    expect(screen.getByText("没有找到匹配的会议")).toBeVisible();
  });
});
