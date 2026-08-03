import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/meetings/actions/create-meeting", () => ({
  createMeetingAction: vi.fn(),
}));

import { CreateMeetingForm } from "./create-meeting-form";

describe("CreateMeetingForm", () => {
  it("renders the approved required fields and timezone input", () => {
    render(<CreateMeetingForm />);

    expect(screen.getByRole("textbox", { name: "会议标题" })).toBeRequired();
    expect(screen.getByLabelText("会议日期和时间")).toBeRequired();
    expect(
      document.querySelector('input[name="timezoneOffset"]'),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建会议" })).toBeEnabled();
  });

  it("renders preserved values and accessible field errors", () => {
    render(
      <CreateMeetingForm
        initialState={{
          status: "error",
          message: "Check the highlighted fields.",
          fieldErrors: { title: "Enter a meeting title." },
          values: { title: "  ", meetingDateLocal: "2026-07-17T09:30" },
        }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "会议标题" })).toHaveValue("  ");
    expect(screen.getByLabelText("会议日期和时间")).toHaveValue(
      "2026-07-17T09:30",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a meeting title.",
    );
  });

  it("closes the native date-time picker after a valid selection", () => {
    const blur = vi.spyOn(HTMLInputElement.prototype, "blur");
    render(<CreateMeetingForm />);

    const meetingDate = screen.getByLabelText("会议日期和时间");
    fireEvent.change(meetingDate, { target: { value: "2026-08-02T10:30" } });

    expect(meetingDate).toHaveValue("2026-08-02T10:30");
    expect(blur).toHaveBeenCalledOnce();
  });
});
