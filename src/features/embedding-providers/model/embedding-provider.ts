export const EMBEDDING_DIMENSIONS = 1536;
export type EmbeddingProviderMetadata = { provider: "mock" | "deepseek" | "openai"; model: string | null };
export interface EmbeddingProvider { readonly metadata: EmbeddingProviderMetadata; embed(text: string, options?: { signal?: AbortSignal }): Promise<number[]>; }
export function validateEmbedding(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) throw new Error("Embedding output is invalid.");
  return vector;
}
