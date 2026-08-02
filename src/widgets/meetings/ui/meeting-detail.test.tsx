import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/meetings/ui/rename-meeting-form", () => ({
  RenameMeetingForm: ({
    meetingId,
    title,
  }: {
    meetingId: string;
    title: string;
  }) => (
    <form aria-label="重命名会议">
      <input name="id" value={meetingId} readOnly />
      <input name="title" value={title} readOnly />
    </form>
  ),
}));

import { MeetingDetail } from "./meeting-detail";

const meeting = {
  id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  title: "Product weekly",
  meetingDate: "2026-07-17T01:30:00.000Z",
  archivedAt: null,
  createdAt: "2026-07-17T01:00:00.000Z",
  updatedAt: "2026-07-17T01:00:00.000Z",
};

describe("MeetingDetail", () => {
  it("renders meeting metadata and keeps rename as the primary action", () => {
    render(<MeetingDetail meeting={meeting} />);

    expect(
      screen.getByRole("heading", { name: "Product weekly" }),
    ).toBeInTheDocument();
    expect(screen.getByText("进行中")).toBeInTheDocument();
    expect(screen.getByText(/2026年7月17日/i)).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "重命名会议" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "归档会议" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "删除会议" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "会议 Copilot" }),
    ).toBeInTheDocument();
  });
});
