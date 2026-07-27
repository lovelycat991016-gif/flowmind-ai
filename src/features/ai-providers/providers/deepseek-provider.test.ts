import { describe, expect, it, vi } from "vitest";

import { AIProviderError, DeepSeekProvider } from "./deepseek-provider";

describe("DeepSeekProvider", () => {
  it("maps server-side structured output without exposing the API key", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"summary":"已生成"}' } }],
        }),
        { status: 200 },
      ),
    );
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
      transport,
    });

    await expect(
      provider.generateStructuredOutput({
        system: "Return JSON",
        input: "meeting text",
      }),
    ).resolves.toEqual({ summary: "已生成" });
    expect(provider.metadata).toEqual({
      provider: "deepseek",
      model: "deepseek-chat",
    });
    expect(JSON.stringify(provider.metadata)).not.toContain("private-key");
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer private-key",
        }),
      }),
    );
  });

  it("maps provider failures to safe errors", async () => {
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
      transport: async () => new Response("internal body", { status: 429 }),
    });

    await expect(
      provider.generateTextResponse({ system: "Help", input: "question" }),
    ).rejects.toEqual(expect.objectContaining({ code: "rate_limited" }));
    await expect(
      provider.generateTextResponse({ system: "Help", input: "question" }),
    ).rejects.not.toThrow("private-key");
    expect(AIProviderError).toBeDefined();
  });
});
