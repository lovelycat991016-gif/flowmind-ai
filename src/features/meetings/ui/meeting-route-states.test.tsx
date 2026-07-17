import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MeetingLoading } from "./meeting-loading";
import { MeetingErrorState } from "./meeting-error-state";

describe("meeting route states", () => {
  it("renders an accessible geometry-matched loading state", () => {
    render(<MeetingLoading variant="list" />);
    expect(
      screen.getByRole("status", { name: "Loading meetings" }),
    ).toBeInTheDocument();
  });

  it("renders a generic retry state without error details", () => {
    const reset = vi.fn();
    render(<MeetingErrorState reset={reset} />);
    expect(screen.getByText("Unable to load meetings")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
