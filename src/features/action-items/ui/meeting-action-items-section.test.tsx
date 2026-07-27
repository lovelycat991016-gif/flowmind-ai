import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/action-items/actions/action-item-actions", () => ({
  completeActionItemAction: vi.fn(),
  createActionItemFromIntelligenceAction: vi.fn(),
}));

import { MeetingActionItemsSection } from "./meeting-action-items-section";

describe("MeetingActionItemsSection", () => {
  it("renders an action center with completion controls", () => {
    render(
      <MeetingActionItemsSection
        archived={false}
        intelligence={null}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        tasks={[
          {
            id: "a",
            title: "完成验收",
            status: "open",
            owner: "李明",
            dueDate: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "行动中心" })).toBeVisible();
    expect(screen.getByText("完成验收")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "修改任务状态" })).toHaveValue(
      "",
    );
    expect(screen.getByRole("button", { name: "完成任务" })).toBeEnabled();
  });

  it("shows intelligence action items and hides mutation controls when archived", () => {
    render(
      <MeetingActionItemsSection
        archived
        intelligence={{
          id: "i",
          result: {
            actionItems: [
              { content: "完成验收", assigneeName: null, dueDate: null },
            ],
          },
        }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        tasks={[]}
      />,
    );

    expect(screen.getByText("完成验收")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "创建任务" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "完成任务" }),
    ).not.toBeInTheDocument();
  });
});
