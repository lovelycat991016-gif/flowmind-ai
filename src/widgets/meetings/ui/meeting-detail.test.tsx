import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/meetings/ui/rename-meeting-form", () => ({
  RenameMeetingForm: ({ meetingId, title }: { meetingId: string; title: string }) => (
    <form aria-label="Rename meeting"><input name="id" value={meetingId} readOnly /><input name="title" value={title} readOnly /></form>
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

    expect(screen.getByRole("heading", { name: "Product weekly" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Jul 17, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Rename meeting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive meeting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete meeting" })).toBeInTheDocument();
  });
});
