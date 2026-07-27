import { describe, expect, it } from "vitest";

import { buildMeetingCopilotPrompt } from "./meeting-copilot-prompt";

describe("buildMeetingCopilotPrompt", () => {
  it("composes the current meeting context and blocks unsupported claims", () => {
    const prompt = buildMeetingCopilotPrompt({
      meetingTitle: "产品周会",
      context: "会议摘要\n本周发布。",
      question: "下一步是什么？",
    });

    expect(prompt.system).toContain("only the supplied meeting context");
    expect(prompt.system).toContain("Do not invent");
    expect(prompt.system).toContain("source");
    expect(prompt.input).toContain("产品周会");
    expect(prompt.input).toContain("本周发布");
    expect(prompt.input).toContain("下一步是什么？");
  });

  it("directs the user when no meeting context is available", () => {
    const prompt = buildMeetingCopilotPrompt({
      meetingTitle: "产品周会",
      context: "暂无可用会议上下文。",
      question: "谁负责验收？",
    });

    expect(prompt.system).toContain("no meeting context is available");
  });
});
