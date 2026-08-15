import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/meeting-copilot/actions/send-meeting-copilot-message",
  () => ({
    sendMeetingCopilotMessageAction: vi.fn(),
  }),
);

import { MeetingCopilotSection } from "./meeting-copilot-section";

const message = {
  id: "11111111-1111-4111-8111-111111111111",
  meetingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  role: "assistant" as const,
  content: "这是模拟 Copilot 回答。",
  createdAt: "2026-07-27T08:00:00.000Z",
};

describe("MeetingCopilotSection", () => {
  it("renders an accessible conversation, prompt input, and send action", () => {
    render(
      <MeetingCopilotSection
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[message]}
      />,
    );

    expect(
      screen.getByRole("log", { name: "会议 Copilot 对话" }),
    ).toHaveTextContent(message.content);
    expect(
      screen.getByRole("textbox", { name: "向 Copilot 提问" }),
    ).toBeRequired();
    expect(screen.getByRole("button", { name: "发送" })).toBeEnabled();
  });

  it("shows safe error feedback and hides the prompt controls for archived meetings", () => {
    const { rerender } = render(
      <MeetingCopilotSection
        initialState={{
          status: "error",
          message: "暂时无法发送，请重试。",
          value: "总结一下这次会议",
        }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[]}
      />,
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByRole("textbox")).toHaveValue("总结一下这次会议");

    rerender(
      <MeetingCopilotSection
        archived
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[message]}
      />,
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows citations only for sources returned by the current successful request", () => {
    render(
      <MeetingCopilotSection
        initialState={{
          status: "success",
          message: "已发送",
          value: "",
          sources: [
            {
              meetingId: "historical-meeting",
              title: "风险讨论会议",
              meetingDate: "2026-07-28",
              content: "上线依赖尚未完成验收。",
              metadata: { timestamp: "00:12:00" },
            },
          ],
        }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[message]}
      />,
    );

    expect(screen.getByRole("region", { name: "知识库来源" })).toHaveTextContent("风险讨论会议");
    expect(screen.getByText("上线依赖尚未完成验收。")).toBeVisible();
    expect(screen.queryByText("知识库当前不可用，已基于本次会议上下文回答。")).not.toBeInTheDocument();
  });

  it("shows the unavailable fallback without rendering fabricated citations", () => {
    const { rerender } = render(
      <MeetingCopilotSection
        initialState={{ status: "success", message: "已发送", value: "", sources: [] }}
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[]}
      />,
    );

    expect(
      screen.getByText("知识库当前不可用，已基于本次会议上下文回答。"),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: "知识库来源" })).not.toBeInTheDocument();

    rerender(
      <MeetingCopilotSection
        meetingId="6b79f5f3-f083-4a75-b74b-41342f2b1454"
        messages={[message]}
      />,
    );
    expect(screen.queryByRole("region", { name: "知识库来源" })).not.toBeInTheDocument();
  });
});
