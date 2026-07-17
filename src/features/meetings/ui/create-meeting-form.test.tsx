import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/meetings/actions/create-meeting", () => ({
  createMeetingAction: vi.fn(),
}));

import { CreateMeetingForm } from "./create-meeting-form";

describe("CreateMeetingForm", () => {
  it("renders the approved required fields and timezone input", () => {
    render(<CreateMeetingForm />);

    expect(screen.getByRole("textbox", { name: "Title" })).toBeRequired();
    expect(screen.getByLabelText("Meeting date and time")).toBeRequired();
    expect(document.querySelector('input[name="timezoneOffset"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create meeting" })).toBeEnabled();
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

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("  ");
    expect(screen.getByLabelText("Meeting date and time")).toHaveValue("2026-07-17T09:30");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a meeting title.");
  });
});
