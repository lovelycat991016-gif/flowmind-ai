import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseAIProviderEnv } from "./ai-provider-env";

describe("AI provider environment", () => {
  it("uses DeepSeek and its default model when selected", () => {
    expect(
      parseAIProviderEnv({
        AI_PROVIDER: "deepseek",
        DEEPSEEK_API_KEY: "secret-key",
      }),
    ).toEqual({
      provider: "deepseek",
      apiKey: "secret-key",
      model: "deepseek-chat",
    });
  });

  it("fails safely when the selected provider key is missing", () => {
    expect(() => parseAIProviderEnv({ AI_PROVIDER: "deepseek" })).toThrow(
      "AI provider configuration is invalid.",
    );
    expect(() =>
      parseAIProviderEnv({
        AI_PROVIDER: "deepseek",
        DEEPSEEK_API_KEY: "   ",
      }),
    ).toThrow("AI provider configuration is invalid.");
  });

  it("falls back to Mock for an unknown provider without retaining its value", () => {
    expect(parseAIProviderEnv({ AI_PROVIDER: "unsupported-provider" })).toEqual(
      { provider: "mock", fallbackReason: "unknown_provider" },
    );
  });

  it("keeps provider credentials out of public environment configuration", () => {
    const source = readFileSync(
      path.resolve("src/shared/config/ai-provider-env.ts"),
      "utf8",
    );

    expect(source).toContain('from "node:process"');
    expect(source).not.toContain("NEXT_PUBLIC_DEEPSEEK_API_KEY");
  });
});
