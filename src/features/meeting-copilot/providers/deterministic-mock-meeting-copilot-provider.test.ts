import { describe, expect, it } from "vitest";

import { DeterministicMockMeetingCopilotProvider } from "./deterministic-mock-meeting-copilot-provider";

describe("DeterministicMockMeetingCopilotProvider", () => {
  it("returns a stable Chinese mock response without provider configuration", async () => {
    const provider = new DeterministicMockMeetingCopilotProvider();

    await expect(
      provider.generate({
        meetingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
        meetingTitle: "产品周会",
        prompt: "谁负责什么任务",
      }),
    ).resolves.toEqual({
      content:
        "这是模拟 Copilot 回答：已收到你关于“谁负责什么任务”的问题。请结合会议记录确认负责人和截止时间。",
      provider: "mock",
    });
  });
});
