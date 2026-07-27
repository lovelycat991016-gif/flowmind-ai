import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, validateEmbedding } from "./embedding-provider";
import { MockEmbeddingProvider } from "../providers/mock-embedding-provider";
describe("embedding provider", () => { it("returns a bounded 1536 dimension mock vector", async () => { await expect(new MockEmbeddingProvider().embed("x")).resolves.toHaveLength(EMBEDDING_DIMENSIONS); expect(() => validateEmbedding([])).toThrow("Embedding output is invalid."); }); });
