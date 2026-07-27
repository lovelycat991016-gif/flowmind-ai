import process from "node:process";
export type EmbeddingProviderConfiguration = { provider: "mock" | "openai" | "deepseek"; model: string | null };
export function getEmbeddingProviderEnv(): EmbeddingProviderConfiguration {
  const provider = process.env.EMBEDDING_PROVIDER?.trim();
  if (provider === "openai") return { provider, model: process.env.EMBEDDING_MODEL?.trim() || null };
  if (provider === "deepseek") return { provider, model: process.env.EMBEDDING_MODEL?.trim() || null };
  return { provider: "mock", model: null };
}
