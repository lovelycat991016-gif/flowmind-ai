import { describe, expect, it } from "vitest";

import {
  MAX_ACTION_ITEMS,
  MAX_DECISIONS,
  MAX_SUMMARY_LENGTH,
  meetingIntelligenceResultSchema,
  meetingIntelligenceTransitionSchema,
} from "./meeting-intelligence-input";

const result = {
  provider: "openai",
  modelIdentifier: "gpt-4.1-mini",
  promptVersion: "meeting_intelligence/v1",
  summary: { content: "项目按计划推进。" },
  actionItems: [
    {
      content: "完成验收文档",
      assigneeName: "李明",
      dueDate: null,
      sourceSegmentIndex: 0,
    },
  ],
  decisions: [{ content: "本周发布测试版本", sourceSegmentIndex: 1 }],
  outputMetadata: { schemaVersion: "v1" },
};

describe("meeting intelligence validation", () => {
  it("accepts a valid provider-neutral intelligence result", () => {
    expect(meetingIntelligenceResultSchema.safeParse(result).success).toBe(
      true,
    );
  });

  it("rejects missing structured fields and invalid metadata", () => {
    expect(
      meetingIntelligenceResultSchema.safeParse({
        ...result,
        summary: undefined,
      }).success,
    ).toBe(false);
    expect(
      meetingIntelligenceResultSchema.safeParse({
        ...result,
        outputMetadata: [],
      }).success,
    ).toBe(false);
  });

  it("enforces summary and extraction collection boundaries", () => {
    expect(
      meetingIntelligenceResultSchema.safeParse({
        ...result,
        summary: { content: "x".repeat(MAX_SUMMARY_LENGTH + 1) },
      }).success,
    ).toBe(false);
    expect(
      meetingIntelligenceResultSchema.safeParse({
        ...result,
        actionItems: Array.from(
          { length: MAX_ACTION_ITEMS + 1 },
          () => result.actionItems[0],
        ),
      }).success,
    ).toBe(false);
    expect(
      meetingIntelligenceResultSchema.safeParse({
        ...result,
        decisions: Array.from(
          { length: MAX_DECISIONS + 1 },
          () => result.decisions[0],
        ),
      }).success,
    ).toBe(false);
  });

  it.each([
    ["queued", "running", true],
    ["running", "completed", true],
    ["queued", "completed", false],
    ["completed", "running", false],
  ])("validates %s to %s as %s", (from, to, valid) => {
    expect(
      meetingIntelligenceTransitionSchema.safeParse({ from, to }).success,
    ).toBe(valid);
  });
});
