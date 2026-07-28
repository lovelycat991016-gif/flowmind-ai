import process from "node:process";

import { z } from "zod";

type EnvInput = Record<string, string | undefined>;

export type EmbeddingProviderConfiguration =
  | {
      provider: "openai";
      apiKey: string;
      model: string;
    }
  | {
      provider: "mock";
      fallbackReason?: "unknown_provider" | "unsupported_provider";
    };

function requireValue(value: string | undefined) {
  const parsed = z.string().trim().min(1).safeParse(value);
  if (!parsed.success) {
    throw new Error("Embedding provider configuration is invalid.");
  }
  return parsed.data;
}

export function parseEmbeddingProviderEnv(
  input: EnvInput,
): EmbeddingProviderConfiguration {
  const provider = input.EMBEDDING_PROVIDER?.trim() || "mock";
  if (provider === "mock") return { provider: "mock" };
  if (provider === "openai") {
    return {
      provider: "openai",
      model: requireValue(input.EMBEDDING_MODEL),
      apiKey: requireValue(input.EMBEDDING_API_KEY),
    };
  }
  if (provider === "deepseek") {
    return { provider: "mock", fallbackReason: "unsupported_provider" };
  }
  return { provider: "mock", fallbackReason: "unknown_provider" };
}

export function getEmbeddingProviderEnv() {
  return parseEmbeddingProviderEnv({
    EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
  });
}
