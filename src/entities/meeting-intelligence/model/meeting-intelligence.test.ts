import { describe, expect, it } from "vitest";

import {
  isRetryableMeetingIntelligenceFailureCode,
  meetingIntelligenceGenerationStatuses,
} from "./meeting-intelligence";

describe("meeting intelligence domain", () => {
  it("uses the persisted generation lifecycle statuses", () => {
    expect(meetingIntelligenceGenerationStatuses).toEqual([
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
    ]);
  });

  it("classifies provider availability failures as retryable", () => {
    expect(
      isRetryableMeetingIntelligenceFailureCode("provider_rate_limited"),
    ).toBe(true);
    expect(
      isRetryableMeetingIntelligenceFailureCode("intelligence_output_invalid"),
    ).toBe(false);
  });
});
