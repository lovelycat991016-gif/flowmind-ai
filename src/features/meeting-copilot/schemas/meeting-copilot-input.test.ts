import { describe, expect, it } from "vitest";

import {
  MAX_MEETING_COPILOT_PROMPT_LENGTH,
  meetingCopilotPromptSchema,
} from "./meeting-copilot-input";

const meetingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

describe("meeting copilot input", () => {
  it("normalizes a valid meeting prompt", () => {
    expect(
      meetingCopilotPromptSchema.parse({
        meetingId,
        prompt: "  总结一下这次会议  ",
      }),
    ).toEqual({ meetingId, prompt: "总结一下这次会议" });
  });

  it("rejects empty, oversized, and invalid meeting prompts", () => {
    expect(
      meetingCopilotPromptSchema.safeParse({ meetingId, prompt: " " }).success,
    ).toBe(false);
    expect(
      meetingCopilotPromptSchema.safeParse({
        meetingId,
        prompt: "a".repeat(MAX_MEETING_COPILOT_PROMPT_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      meetingCopilotPromptSchema.safeParse({
        meetingId: "not-a-uuid",
        prompt: "总结一下这次会议",
      }).success,
    ).toBe(false);
  });
});
