import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";
import { Button } from "./button";
import { CardTitle } from "./card";
import { EmptyPlaceholder } from "./empty-placeholder";
import { Skeleton } from "./skeleton";

describe("dashboard UI primitives", () => {
  it("uses a level-three heading for card titles by default", () => {
    render(<CardTitle>Meeting activity</CardTitle>);

    expect(
      screen.getByRole("heading", { level: 3, name: "Meeting activity" }),
    ).toBeVisible();
  });

  it("allows a page-level card title when explicitly requested", () => {
    render(<CardTitle as="h1">Welcome back</CardTitle>);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeVisible();
  });

  it("renders a readable status badge", () => {
    render(<Badge variant="success">Complete</Badge>);

    expect(screen.getByText("Complete")).toHaveAttribute(
      "data-variant",
      "success",
    );
  });

  it("announces an empty placeholder without treating its icon as content", () => {
    render(
      <EmptyPlaceholder
        description="New uploads will appear here."
        icon={Inbox}
        title="No recordings in progress"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No recordings in progress",
    );
    expect(screen.getByRole("heading", { level: 3 })).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps decorative skeletons out of the accessibility tree", () => {
    render(<Skeleton className="h-8" />);

    expect(screen.getByTestId("skeleton")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("forwards a button ref for focus management", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Open navigation</Button>);

    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Open navigation" }),
    );
  });
});
