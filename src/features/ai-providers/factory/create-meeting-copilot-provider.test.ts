import { describe, expect, it, vi } from "vitest";

import { AIProviderError } from "@/features/ai-providers/model/ai-provider";
import { createMeetingCopilotProviderFromAIProvider } from "./create-meeting-copilot-provider";

describe("meeting Copilot provider factory", () => {
  it("uses the selected AI provider with the constructed meeting context", async () => {
    const generateTextResponse = vi.fn().mockResolvedValue("请先完成验收。");
    const provider = createMeetingCopilotProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi.fn(),
      generateTextResponse,
    });

    await expect(
      provider.generate({
        meetingId: "m",
        meetingTitle: "产品周会",
        prompt: "下一步是什么？",
        context: "行动项\n- 完成验收",
      }),
    ).resolves.toEqual({ content: "请先完成验收。", provider: "deepseek" });
    expect(generateTextResponse).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining("完成验收") }),
    );
  });

  it("does not expose generic provider errors", async () => {
    const provider = createMeetingCopilotProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi.fn(),
      generateTextResponse: vi
        .fn()
        .mockRejectedValue(new AIProviderError("timeout")),
    });

    await expect(
      provider.generate({
        meetingId: "m",
        meetingTitle: "产品周会",
        prompt: "下一步是什么？",
        context: "暂无可用会议上下文。",
      }),
    ).rejects.toThrow("Unable to generate meeting Copilot response.");
  });
});
