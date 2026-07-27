import { describe, expect, it, vi } from "vitest";

const { reportServerEventMock } = vi.hoisted(() => ({
  reportServerEventMock: vi.fn(),
}));

vi.mock("@/shared/observability/server", () => ({
  reportServerEvent: reportServerEventMock,
}));

import { createAIProvider } from "./create-ai-provider";

describe("createAIProvider", () => {
  it("selects DeepSeek, OpenAI, or Mock from validated configuration", () => {
    expect(
      createAIProvider({
        provider: "deepseek",
        apiKey: "deepseek-key",
        model: "deepseek-chat",
      }).metadata.provider,
    ).toBe("deepseek");
    expect(
      createAIProvider({
        provider: "openai",
        apiKey: "openai-key",
        model: "gpt-4.1-mini",
      }).metadata.provider,
    ).toBe("openai");
    expect(createAIProvider({ provider: "mock" }).metadata.provider).toBe(
      "mock",
    );
  });

  it("records a redacted diagnostic when configuration falls back to Mock", () => {
    const provider = createAIProvider({
      provider: "mock",
      fallbackReason: "unknown_provider",
    });

    expect(provider.metadata.provider).toBe("mock");
    expect(reportServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: "provider", outcome: "failure" }),
    );
    expect(JSON.stringify(reportServerEventMock.mock.calls)).not.toContain(
      "unsupported-provider",
    );
  });
});
