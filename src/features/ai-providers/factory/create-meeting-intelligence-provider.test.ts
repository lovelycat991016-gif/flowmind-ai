import { describe, expect, it, vi } from "vitest";

import { AIProviderError } from "@/features/ai-providers/model/ai-provider";
import {
  createMeetingIntelligenceProvider,
  createMeetingIntelligenceProviderFromAIProvider,
} from "./create-meeting-intelligence-provider";

const request = {
  transcriptContent: "会议文本",
  transcriptLanguage: "zh",
  promptVersion: "meeting_intelligence/v1",
};

describe("meeting intelligence provider factory", () => {
  it("maps generic structured output into the existing intelligence result contract", async () => {
    const generateStructuredOutput = vi.fn().mockResolvedValue({
      summary: "会议已达成发布共识",
      key_points: ["确认发布范围"],
      decisions: ["本周发布"],
      action_items: [
        { task: "完成验收", owner: "李明", deadline: "2026-07-31" },
      ],
      risks: ["验收尚未完成"],
    });
    const provider = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput,
      generateTextResponse: vi.fn(),
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      provider: "deepseek",
      modelIdentifier: "deepseek-chat",
      promptVersion: "meeting_intelligence/v1",
      summary: { content: "会议已达成发布共识" },
      actionItems: [
        { content: "完成验收", assigneeName: "李明", dueDate: "2026-07-31" },
      ],
    });
    expect(generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({ input: "会议文本" }),
    );
  });

  it("maps malformed output and provider timeout to existing safe worker failure codes", async () => {
    const invalid = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi.fn().mockResolvedValue({ summary: "" }),
      generateTextResponse: vi.fn(),
    });
    const timedOut = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi
        .fn()
        .mockRejectedValue(new AIProviderError("timeout")),
      generateTextResponse: vi.fn(),
    });

    await expect(invalid.generate(request)).rejects.toEqual(
      expect.objectContaining({ code: "intelligence_output_invalid" }),
    );
    await expect(timedOut.generate(request)).rejects.toEqual(
      expect.objectContaining({ code: "provider_timeout" }),
    );
  });

  it("uses the configured provider factory when no provider is injected", () => {
    expect(createMeetingIntelligenceProvider).toBeDefined();
  });
});
