import { describe, expect, it } from "vitest";

import {
  buildMeetingIntelligencePrompt,
  MEETING_INTELLIGENCE_PROMPT_VERSION,
} from "./meeting-intelligence-prompt";

describe("buildMeetingIntelligencePrompt", () => {
  it("requires the compatible intelligence schema with richer meeting guidance", () => {
    const prompt = buildMeetingIntelligencePrompt("zh-CN");

    expect(MEETING_INTELLIGENCE_PROMPT_VERSION).toBe("meeting_intelligence/v2");
    expect(prompt.system).toContain("summary");
    expect(prompt.system).toContain("key_points");
    expect(prompt.system).toContain("decisions");
    expect(prompt.system).toContain("action_items");
    expect(prompt.system).toContain("risks");
    expect(prompt.system).toContain("会议目的");
    expect(prompt.system).toContain("核心结论");
    expect(prompt.system).toContain("后续方向");
    expect(prompt.system).toContain("决策背景");
    expect(prompt.system).toContain("优先级");
    expect(prompt.system).toContain("严重程度");
  });

  it("keeps empty transcript input explicit instead of inventing data", () => {
    expect(buildMeetingIntelligencePrompt(null).input("")).toContain(
      "No transcript content was supplied",
    );
  });
});
