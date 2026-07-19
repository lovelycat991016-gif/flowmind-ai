import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/meetings/actions/delete-meeting", () => ({
  deleteMeetingAction: vi.fn(),
}));

import { DeleteMeetingDialog } from "./delete-meeting-dialog";

describe("DeleteMeetingDialog", () => {
  it("requires an explicit command after naming the meeting", () => {
    render(
      <DeleteMeetingDialog
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        title="Product weekly"
      />,
    );
    const trigger = screen.getByRole("button", { name: "删除会议" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveTextContent("Product weekly");
    expect(
      screen.getByRole("button", { name: "永久删除" }),
    ).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(
      <DeleteMeetingDialog
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        title="Product weekly"
      />,
    );
    const trigger = screen.getByRole("button", { name: "删除会议" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
