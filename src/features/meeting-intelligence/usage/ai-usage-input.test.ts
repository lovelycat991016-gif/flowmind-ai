import { describe, expect, it } from "vitest";

import { aiUsageEventSchema } from "./ai-usage-input";

const baseEvent = {
  meetingIntelligenceId: "8f641098-b6a2-4f8c-84ad-38820f430391",
  userId: "5b13f6b1-1456-4cc1-bbb4-f85b253f6d34",
  operationType: "meeting_intelligence_generation",
  attemptNumber: 1,
  provider: null,
  modelIdentifier: null,
  inputTokens: null,
  outputTokens: null,
  estimatedCostMicrounits: null,
  outcome: "completed",
  failureCode: null,
};

describe("AI usage event validation", () => {
  it("accepts a completed event without unavailable provider usage", () => {
    expect(aiUsageEventSchema.parse(baseEvent)).toEqual(baseEvent);
  });

  it("accepts bounded provider metadata and safe failed outcomes", () => {
    expect(
      aiUsageEventSchema.parse({
        ...baseEvent,
        attemptNumber: 2,
        provider: "openai",
        modelIdentifier: "gpt-4.1-mini",
        inputTokens: 1200,
        outputTokens: 400,
        estimatedCostMicrounits: 1000,
        outcome: "failed",
        failureCode: "provider_timeout",
      }),
    ).toMatchObject({ outcome: "failed", failureCode: "provider_timeout" });
  });

  it("rejects invalid attempts, negative usage, and unsafe outcome metadata", () => {
    expect(
      aiUsageEventSchema.safeParse({ ...baseEvent, attemptNumber: 0 }).success,
    ).toBe(false);
    expect(
      aiUsageEventSchema.safeParse({ ...baseEvent, inputTokens: -1 }).success,
    ).toBe(false);
    expect(
      aiUsageEventSchema.safeParse({
        ...baseEvent,
        outcome: "failed",
        failureCode: null,
      }).success,
    ).toBe(false);
  });
});
