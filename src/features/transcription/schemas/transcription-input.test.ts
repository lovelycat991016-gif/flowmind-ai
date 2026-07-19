import { describe, expect, it } from "vitest";

import {
  MAX_TRANSCRIPT_CONTENT_LENGTH,
  transcriptionFailureCodeSchema,
  transcriptionResultSchema,
  transcriptionWorkerLifecycleTransitionSchema,
} from "./transcription-input";

const validResult = {
  provider: "openai",
  providerModel: "whisper-1",
  language: "zh",
  content: "本周项目进展顺利。",
  segments: [
    {
      segmentIndex: 0,
      startMs: 0,
      endMs: 1200,
      content: "本周项目进展顺利。",
    },
  ],
};

describe("transcription result validation", () => {
  it("accepts a provider-neutral ordered transcription result", () => {
    expect(transcriptionResultSchema.safeParse(validResult).success).toBe(true);
    expect(
      transcriptionResultSchema.safeParse({
        ...validResult,
        provider: "test-provider",
      }).success,
    ).toBe(true);
  });

  it("rejects blank content, invalid timing, and unordered segments", () => {
    expect(
      transcriptionResultSchema.safeParse({ ...validResult, content: "   " })
        .success,
    ).toBe(false);
    expect(
      transcriptionResultSchema.safeParse({
        ...validResult,
        segments: [{ ...validResult.segments[0], endMs: -1 }],
      }).success,
    ).toBe(false);
    expect(
      transcriptionResultSchema.safeParse({
        ...validResult,
        segments: [
          { ...validResult.segments[0], segmentIndex: 1 },
          {
            segmentIndex: 0,
            startMs: 1201,
            endMs: 2000,
            content: "下一段。",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("enforces the transcript content boundary", () => {
    expect(
      transcriptionResultSchema.safeParse({
        ...validResult,
        content: "x".repeat(MAX_TRANSCRIPT_CONTENT_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      transcriptionResultSchema.safeParse({
        ...validResult,
        content: "x".repeat(MAX_TRANSCRIPT_CONTENT_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe("transcription worker status handling", () => {
  it.each([
    ["queued", "running"],
    ["running", "completed"],
    ["running", "failed"],
    ["running", "cancelled"],
  ])("allows %s to %s", (from, to) => {
    expect(
      transcriptionWorkerLifecycleTransitionSchema.safeParse({ from, to })
        .success,
    ).toBe(true);
  });

  it.each([
    ["queued", "completed"],
    ["queued", "cancelled"],
    ["completed", "running"],
    ["failed", "running"],
  ])("rejects %s to %s", (from, to) => {
    expect(
      transcriptionWorkerLifecycleTransitionSchema.safeParse({ from, to })
        .success,
    ).toBe(false);
  });

  it("accepts only safe worker failure codes", () => {
    expect(
      transcriptionFailureCodeSchema.safeParse("provider_timeout").success,
    ).toBe(true);
    expect(
      transcriptionFailureCodeSchema.safeParse("provider error details")
        .success,
    ).toBe(false);
  });
});
