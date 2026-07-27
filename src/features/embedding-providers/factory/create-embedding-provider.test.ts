import { describe, expect, it } from "vitest";
import { createEmbeddingProvider } from "./create-embedding-provider";
describe("createEmbeddingProvider", () => {
  it("returns the safe mock provider without making an external request", async () => {
    const provider = createEmbeddingProvider();
    expect(provider.metadata.provider).toBe("mock");
    await expect(provider.embed("private meeting text")).resolves.toHaveLength(1536);
  });
  it("keeps openai, deepseek, and unknown configuration in the no-network mock boundary", () => {
    for (const provider of ["openai", "deepseek", "unknown"]) {
      process.env.EMBEDDING_PROVIDER = provider;
      expect(createEmbeddingProvider().metadata.provider).toBe("mock");
    }
    delete process.env.EMBEDDING_PROVIDER;
  });
});
