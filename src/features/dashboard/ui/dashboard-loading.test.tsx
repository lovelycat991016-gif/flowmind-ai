import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardLoading } from "./dashboard-loading";

describe("DashboardLoading", () => {
  it("announces loading while keeping decorative skeletons hidden", () => {
    render(<DashboardLoading />);

    const status = screen.getByRole("status", { name: "正在加载工作台" });
    expect(status).toHaveTextContent("正在加载工作台");
    expect(within(status).getAllByTestId("skeleton").length).toBeGreaterThan(8);
  });

  it("mirrors the statistics and primary content regions", () => {
    render(<DashboardLoading />);

    expect(
      within(screen.getByTestId("loading-statistics")).getAllByTestId(
        "skeleton",
      ),
    ).toHaveLength(4);
    expect(screen.getByTestId("loading-recent-meetings")).toBeInTheDocument();
    expect(screen.getByTestId("loading-quick-actions")).toBeInTheDocument();
  });
});
