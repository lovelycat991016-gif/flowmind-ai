import { describe, expect, it } from "vitest";

import {
  buildMeetingIntelligencePrompt,
  MEETING_INTELLIGENCE_PROMPT_VERSION,
} from "./meeting-intelligence-prompt";

describe("buildMeetingIntelligencePrompt", () => {
  it("requires the compatible intelligence schema with richer meeting guidance", () => {
    const prompt = buildMeetingIntelligencePrompt("zh-CN");

    expect(MEETING_INTELLIGENCE_PROMPT_VERSION).toBe("meeting_intelligence/v4");
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

  it("defines missing or null owner and deadline as unknown without relaxing task requirements", () => {
    const prompt = buildMeetingIntelligencePrompt("zh-CN");

    expect(prompt.system).toContain("owner and deadline are optional");
    expect(prompt.system).toContain("omit the field or use JSON null");
    expect(prompt.system).toContain("task is always required");
    expect(prompt.system).toContain("Do not invent people or dates");
  });

  it("requires evidence-backed deadlines to use only the YYYY-MM-DD date format", () => {
    const prompt = buildMeetingIntelligencePrompt("zh-CN");

    expect(prompt.system).toContain("deadline must use YYYY-MM-DD");
    expect(prompt.system).toContain(
      "deadline may be omitted or set to JSON null",
    );
    expect(prompt.system).toContain("Never guess a deadline");
    expect(prompt.system).toContain(
      'Do not use natural-language dates such as "下周五" or "月底"',
    );
    expect(prompt.system).toContain(
      'Do not include a time or timestamp such as "2026-09-15T10:00:00Z"',
    );
    expect(prompt.system).toContain("Do not use any other date format");
  });

  it("keeps empty transcript input explicit instead of inventing data", () => {
    expect(buildMeetingIntelligencePrompt(null).input("")).toContain(
      "No transcript content was supplied",
    );
  });
});
