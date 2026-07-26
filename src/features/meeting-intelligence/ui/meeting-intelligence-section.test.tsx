import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { zhCN } from "@/shared/i18n/zh-CN";
import { MeetingIntelligenceSection } from "./meeting-intelligence-section";
const result = {
  summary: { content: "项目按计划推进。" },
  keyPoints: ["本周完成测试"],
  actionItems: [
    {
      content: "完成验收",
      assigneeName: null,
      dueDate: null,
      sourceSegmentIndex: null,
    },
  ],
  decisions: [{ content: "本周发布", sourceSegmentIndex: null }],
  risks: ["发布前需要复核权限"],
};
describe("MeetingIntelligenceSection", () => {
  it("renders completed intelligence sections accessibly", () => {
    render(
      <MeetingIntelligenceSection
        intelligence={{ status: "completed", result }}
      />,
    );
    expect(screen.getByText("项目按计划推进。")).toBeVisible();
    expect(
      screen.getByRole("list", { name: zhCN.intelligence.actionItems }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: zhCN.intelligence.decisions }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: zhCN.intelligence.keyPoints }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: zhCN.intelligence.risks }),
    ).toBeVisible();
  });
  it.each([
    ["queued", "statusQueued"],
    ["running", "statusRunning"],
    ["failed", "statusFailed"],
    ["cancelled", "statusCancelled"],
  ] as const)("renders %s with a distinct safe status", (status, key) => {
    render(
      <MeetingIntelligenceSection intelligence={{ status, result: null }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      zhCN.intelligence[key],
    );
  });
  it("shows empty state when intelligence is missing and stays read-only when archived", () => {
    render(<MeetingIntelligenceSection archived intelligence={null} />);
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
