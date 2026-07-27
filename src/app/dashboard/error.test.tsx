import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardError from "./error";

describe("DashboardError", () => {
  it("shows a safe Chinese retry state", () => {
    render(<DashboardError error={new Error("internal")} reset={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "暂时无法加载 AI 工作台，请重试。",
    );
    expect(screen.getByRole("button", { name: "重试" })).toBeEnabled();
  });
});
