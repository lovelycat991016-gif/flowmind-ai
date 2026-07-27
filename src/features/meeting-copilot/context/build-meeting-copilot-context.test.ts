import { describe, expect, it } from "vitest";

import { formatMeetingCopilotContext } from "./build-meeting-copilot-context";

describe("formatMeetingCopilotContext", () => {
  it("builds a bounded prompt context from transcript, intelligence, and action items", () => {
    const context = formatMeetingCopilotContext({
      transcript: "本次会议确认本周发布。",
      summary: "确认发布范围和验收责任。",
      decisions: ["本周发布"],
      actionItems: [{ title: "完成验收", owner: "李明", status: "open" }],
      risks: ["验收尚未完成"],
    });

    expect(context).toContain("会议转录\n本次会议确认本周发布。");
    expect(context).toContain("会议摘要\n确认发布范围和验收责任。");
    expect(context).toContain("关键决策\n- 本周发布");
    expect(context).toContain("行动项\n- 完成验收（李明，待处理）");
    expect(context).toContain("风险\n- 验收尚未完成");
  });

  it("returns a safe empty context for a meeting without generated data", () => {
    expect(
      formatMeetingCopilotContext({
        transcript: null,
        summary: null,
        decisions: [],
        actionItems: [],
        risks: [],
      }),
    ).toBe("暂无可用会议上下文。");
  });
});
