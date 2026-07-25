import { describe, expect, it } from "vitest";

import {
  MAX_MANUAL_INTELLIGENCE_INPUT_LENGTH,
  manualIntelligenceInputSchema,
} from "./manual-intelligence-input";

const input = {
  meetingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  inputText: "  讨论下周发布计划。  ",
};

describe("manual intelligence input schema", () => {
  it("normalizes a bounded manual meeting text input", () => {
    expect(manualIntelligenceInputSchema.parse(input)).toEqual({
      meetingId: input.meetingId,
      inputText: "讨论下周发布计划。",
    });
  });

  it("rejects missing meeting ids, blank text, and oversized input", () => {
    expect(
      manualIntelligenceInputSchema.safeParse({ ...input, meetingId: "bad" })
        .success,
    ).toBe(false);
    expect(
      manualIntelligenceInputSchema.safeParse({ ...input, inputText: "   " })
        .success,
    ).toBe(false);
    expect(
      manualIntelligenceInputSchema.safeParse({
        ...input,
        inputText: "a".repeat(MAX_MANUAL_INTELLIGENCE_INPUT_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});
