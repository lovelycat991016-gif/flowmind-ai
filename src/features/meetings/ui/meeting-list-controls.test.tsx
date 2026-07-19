import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { MeetingListControls } from "./meeting-list-controls";

const state = {
  q: "weekly",
  filter: "active",
  sort: "date-desc",
  page: 2,
} as const;

describe("MeetingListControls", () => {
  it("renders approved search, filter, sort, and create controls", () => {
    render(<MeetingListControls state={state} />);

    expect(screen.getByRole("searchbox", { name: "搜索会议" })).toHaveValue(
      "weekly",
    );
    expect(screen.getByRole("link", { name: "进行中" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "已归档" })).toHaveAttribute(
      "href",
      expect.stringContaining("filter=archived"),
    );
    expect(screen.getByRole("combobox", { name: "排序方式" })).toHaveValue(
      "date-desc",
    );
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "新建会议" })).toHaveAttribute(
      "href",
      "/meetings/new",
    );
  });

  it("resets page state when submitting a title search", () => {
    render(<MeetingListControls state={state} />);

    expect(screen.getByRole("search", { name: "搜索会议" })).toHaveAttribute(
      "action",
      "/meetings",
    );
    expect(screen.getByDisplayValue("active")).toHaveAttribute(
      "name",
      "filter",
    );
    expect(screen.getByDisplayValue("date-desc")).toHaveAttribute(
      "name",
      "sort",
    );
    expect(screen.queryByDisplayValue("2")).not.toBeInTheDocument();
  });
});
