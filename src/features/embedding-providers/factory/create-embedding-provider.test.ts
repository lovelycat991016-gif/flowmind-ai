import { afterEach, describe, expect, it } from "vitest";

import { createEmbeddingProvider } from "./create-embedding-provider";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("createEmbeddingProvider", () => {
  it("returns the deterministic mock provider when selected", async () => {
    process.env.EMBEDDING_PROVIDER = "mock";

    const provider = createEmbeddingProvider();

    expect(provider.metadata).toEqual({ provider: "mock", model: null });
    await expect(provider.embed("private meeting text")).resolves.toHaveLength(
      1536,
    );
  });

  it("selects the production OpenAI-compatible embedding provider", () => {
    process.env.EMBEDDING_PROVIDER = "openai";
    process.env.EMBEDDING_MODEL = "text-embedding-3-small";
    process.env.EMBEDDING_API_KEY = "private-key";

    expect(createEmbeddingProvider().metadata).toEqual({
      provider: "openai",
      model: "text-embedding-3-small",
    });
  });

  it("does not enable an unimplemented or unknown provider", () => {
    for (const provider of ["deepseek", "unknown"]) {
      process.env.EMBEDDING_PROVIDER = provider;
      delete process.env.EMBEDDING_MODEL;
      delete process.env.EMBEDDING_API_KEY;

      expect(createEmbeddingProvider().metadata.provider).toBe("mock");
    }
  });
});
