import { EMBEDDING_DIMENSIONS, type EmbeddingProvider } from "../model/embedding-provider";
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly metadata = { provider: "mock" as const, model: null };
  async embed(text: string) { const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0); vector[text.length % EMBEDDING_DIMENSIONS] = 1; return vector; }
}
