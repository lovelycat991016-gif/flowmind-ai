import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseEmbeddingProviderEnv } from "./embedding-provider-env";

describe("embedding provider environment", () => {
  it("reads the production embedding configuration from independent variables", () => {
    expect(
      parseEmbeddingProviderEnv({
        EMBEDDING_PROVIDER: "openai",
        EMBEDDING_MODEL: "text-embedding-3-small",
        EMBEDDING_API_KEY: "private-key",
      }),
    ).toEqual({
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "private-key",
    });
  });

  it("fails safely when a production embedding secret or model is missing", () => {
    expect(() =>
      parseEmbeddingProviderEnv({
        EMBEDDING_PROVIDER: "openai",
        EMBEDDING_MODEL: "text-embedding-3-small",
      }),
    ).toThrow("Embedding provider configuration is invalid.");
    expect(() =>
      parseEmbeddingProviderEnv({
        EMBEDDING_PROVIDER: "openai",
        EMBEDDING_API_KEY: "private-key",
      }),
    ).toThrow("Embedding provider configuration is invalid.");
  });

  it("keeps unknown and unimplemented providers in the no-network mock boundary", () => {
    expect(
      parseEmbeddingProviderEnv({ EMBEDDING_PROVIDER: "deepseek" }),
    ).toEqual({ provider: "mock", fallbackReason: "unsupported_provider" });
    expect(
      parseEmbeddingProviderEnv({ EMBEDDING_PROVIDER: "unknown" }),
    ).toEqual({ provider: "mock", fallbackReason: "unknown_provider" });
  });

  it("does not expose an embedding key through public environment variables", () => {
    const source = readFileSync(
      path.resolve("src/shared/config/embedding-provider-env.ts"),
      "utf8",
    );

    expect(source).toContain('from "node:process"');
    expect(source).not.toContain("NEXT_PUBLIC_EMBEDDING_API_KEY");
  });
});
