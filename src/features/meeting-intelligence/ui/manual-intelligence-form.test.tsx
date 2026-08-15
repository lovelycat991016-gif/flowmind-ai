import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/meeting-intelligence/actions/create-manual-intelligence",
  () => ({
    createManualIntelligenceAction: vi.fn(),
  }),
);

import { ManualIntelligenceForm } from "./manual-intelligence-form";

describe("ManualIntelligenceForm", () => {
  it("renders an accessible meeting text input and generation action", () => {
    render(
      <ManualIntelligenceForm meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454" />,
    );

    expect(screen.getByRole("textbox", { name: "会议内容" })).toBeRequired();
    expect(screen.getByRole("button", { name: "生成AI分析" })).toBeEnabled();
  });

  it("shows safe server feedback and hides controls for archived meetings", () => {
    const { rerender } = render(
      <ManualIntelligenceForm
        initialState={{
          status: "error",
          message: "暂时无法创建AI分析任务，请重试。",
          value: "会议内容",
        }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
      />,
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("会议内容");

    rerender(
      <ManualIntelligenceForm
        archived
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
      />,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("announces successful task creation through a live status region", () => {
    render(
      <ManualIntelligenceForm
        initialState={{
          status: "success",
          message: "AI分析任务已创建，结果生成后将显示在此处。",
          value: "",
        }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("AI分析任务已创建");
  });
});
