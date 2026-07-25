import { describe, expect, it, vi } from "vitest";

import {
  OpenAIMeetingIntelligenceProvider,
  OpenAIMeetingIntelligenceProviderError,
} from "./openai-meeting-intelligence-provider";

const request = {
  transcriptContent: "讨论下周发布与负责人安排。",
  transcriptLanguage: "zh",
  promptVersion: "meeting_intelligence/v1",
};

const output = {
  summary: "团队确认下周发布。",
  decisions: ["下周三发布。"],
  action_items: [
    { task: "完成发布检查", owner: "李明", deadline: "2026-07-30" },
  ],
};

describe("OpenAIMeetingIntelligenceProvider", () => {
  it("maps a structured Responses API result through the provider-neutral contract", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: JSON.stringify(output) }), {
        status: 200,
      }),
    );
    const provider = new OpenAIMeetingIntelligenceProvider({
      apiKey: "server-only-key",
      model: "gpt-4.1-mini",
      transport,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      provider: "openai",
      modelIdentifier: "gpt-4.1-mini",
      promptVersion: request.promptVersion,
      summary: { content: output.summary },
      decisions: [{ content: output.decisions[0] }],
      actionItems: [
        {
          content: output.action_items[0]?.task,
          assigneeName: output.action_items[0]?.owner,
          dueDate: output.action_items[0]?.deadline,
        },
      ],
    });
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.openai.com/v1/responses",
        headers: expect.objectContaining({
          Authorization: "Bearer server-only-key",
        }),
      }),
    );
  });

  it("rejects malformed output and provider failures without exposing raw details", async () => {
    const malformed = new OpenAIMeetingIntelligenceProvider({
      apiKey: "server-only-key",
      model: "gpt-4.1-mini",
      transport: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ output_text: "not json" }), {
            status: 200,
          }),
        ),
    });
    const unavailable = new OpenAIMeetingIntelligenceProvider({
      apiKey: "server-only-key",
      model: "gpt-4.1-mini",
      transport: vi
        .fn()
        .mockResolvedValue(new Response("provider detail", { status: 503 })),
    });

    await expect(malformed.generate(request)).rejects.toBeInstanceOf(
      OpenAIMeetingIntelligenceProviderError,
    );
    await expect(unavailable.generate(request)).rejects.toMatchObject({
      code: "provider_unavailable",
      message: "Unable to generate meeting intelligence.",
    });
  });
});
