import { describe, expect, it } from "vitest";

import {
  isRetryableTranscriptionFailureCode,
  type Transcript,
  type TranscriptionResult,
} from "./transcript";

describe("transcript domain", () => {
  it("defines durable transcript and provider-neutral result contracts", () => {
    const transcript: Transcript = {
      id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
      recordingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
      userId: "2c15dfe2-ea8c-420e-85ad-e85901974931",
      provider: "openai",
      providerModel: "whisper-1",
      language: "zh",
      content: "本周项目进展顺利。",
      completedAt: "2026-07-20T08:00:00.000Z",
      createdAt: "2026-07-20T08:00:00.000Z",
      updatedAt: "2026-07-20T08:00:00.000Z",
    };
    const result: TranscriptionResult = {
      provider: "test-provider",
      providerModel: "test-model",
      language: null,
      content: "Transcript content.",
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          content: "Transcript content.",
        },
      ],
    };

    expect(transcript.content).toBe("本周项目进展顺利。");
    expect(result.segments).toHaveLength(1);
    expect(result.provider).toBe("test-provider");
  });

  it("classifies only transient failure codes as retryable", () => {
    expect(isRetryableTranscriptionFailureCode("provider_rate_limited")).toBe(
      true,
    );
    expect(isRetryableTranscriptionFailureCode("storage_object_missing")).toBe(
      false,
    );
  });
});
