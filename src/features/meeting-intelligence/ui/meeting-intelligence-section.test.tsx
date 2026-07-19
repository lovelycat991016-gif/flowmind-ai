import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MeetingIntelligenceSection } from "./meeting-intelligence-section";
const result = {
  summary: { content: "项目按计划推进。" },
  actionItems: [
    {
      content: "完成验收",
      assigneeName: null,
      dueDate: null,
      sourceSegmentIndex: null,
    },
  ],
  decisions: [{ content: "本周发布", sourceSegmentIndex: null }],
};
describe("MeetingIntelligenceSection", () => {
  it("renders completed summary, action items, and decisions accessibly", () => {
    render(
      <MeetingIntelligenceSection
        intelligence={{ status: "completed", result }}
      />,
    );
    expect(screen.getByText("项目按计划推进。")).toBeVisible();
    expect(screen.getByRole("list", { name: "行动项" })).toBeVisible();
    expect(screen.getByRole("list", { name: "决策" })).toBeVisible();
  });
  it.each(["queued", "running", "failed", "cancelled"] as const)(
    "renders %s as a safe status",
    (status) => {
      render(
        <MeetingIntelligenceSection intelligence={{ status, result: null }} />,
      );
      expect(screen.getByRole("status")).toBeVisible();
    },
  );
  it("shows empty state when intelligence is missing and stays read-only when archived", () => {
    render(<MeetingIntelligenceSection archived intelligence={null} />);
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
