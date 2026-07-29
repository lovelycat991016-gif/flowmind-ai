import { describe, expect, it } from "vitest";

import {
  analyzeAiReliability,
  type AiUsageEventForAnalysis,
} from "./analyze-ai-reliability";

const ownerEvents: AiUsageEventForAnalysis[] = [
  {
    provider: "deepseek",
    modelIdentifier: "deepseek-chat",
    operationType: "meeting_copilot_response",
    outcome: "completed",
    failureCode: null,
    latencyMs: 100,
  },
  {
    provider: "deepseek",
    modelIdentifier: "deepseek-chat",
    operationType: "meeting_copilot_response",
    outcome: "failed",
    failureCode: "provider_timeout",
    latencyMs: 200,
  },
  {
    provider: "deepseek",
    modelIdentifier: "deepseek-chat",
    operationType: "meeting_copilot_response",
    outcome: "completed",
    failureCode: null,
    latencyMs: 300,
  },
];

describe("analyzeAiReliability", () => {
  it("aggregates provider, model, operation outcomes, failures, and latency metrics", () => {
    expect(analyzeAiReliability(ownerEvents)).toEqual([
      {
        provider: "deepseek",
        modelIdentifier: "deepseek-chat",
        operationType: "meeting_copilot_response",
        requestCount: 3,
        successRate: 2 / 3,
        failureBreakdown: { provider_timeout: 1 },
        latency: {
          sampleCount: 3,
          minMs: 100,
          maxMs: 300,
          averageMs: 200,
          p50Ms: 200,
          p95Ms: 300,
        },
      },
    ]);
  });
});
