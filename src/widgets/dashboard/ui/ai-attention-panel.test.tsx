import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiAttentionPanel } from "./ai-attention-panel";

describe("AiAttentionPanel", () => {
  it("renders explainable dashboard insights with accessible lists", () => {
    render(
      <AiAttentionPanel
        attention={{
          todayMeetingCount: 2,
          completedIntelligenceCount: 4,
          openTaskCount: 3,
          riskReminders: [
            { meetingId: "m1", meetingTitle: "产品周会", content: "完成验收" },
          ],
          recentDecisions: [
            { meetingId: "m1", meetingTitle: "产品周会", content: "本周发布" },
          ],
          recentActivities: [
            {
              meetingId: "m1",
              meetingTitle: "产品周会",
              status: "completed",
              updatedAt: "2026-07-27T08:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "AI 工作台" })).toBeVisible();
    expect(screen.getByText("今日会议 2 场")).toBeVisible();
    expect(screen.getByRole("list", { name: "风险提醒" })).toHaveTextContent(
      "完成验收",
    );
    expect(screen.getByRole("list", { name: "最近关键决策" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("AI 分析已完成");
  });

  it("shows a safe empty state when no AI workspace data is available", () => {
    render(
      <AiAttentionPanel
        attention={{
          todayMeetingCount: 0,
          completedIntelligenceCount: 0,
          openTaskCount: 0,
          riskReminders: [],
          recentDecisions: [],
          recentActivities: [],
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "暂无需要关注的 AI 工作项。",
    );
  });
});
