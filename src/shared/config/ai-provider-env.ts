import process from "node:process";

import { z } from "zod";

const providerSchema = z.enum(["deepseek", "openai", "mock"]);

type EnvInput = Record<string, string | undefined>;

export type AIProviderConfiguration =
  | { provider: "deepseek"; apiKey: string; model: string }
  | { provider: "openai"; apiKey: string; model: string }
  | { provider: "mock"; fallbackReason?: "unknown_provider" };

function requireValue(value: string | undefined) {
  const parsed = z.string().trim().min(1).safeParse(value);
  if (!parsed.success) throw new Error("AI provider configuration is invalid.");
  return parsed.data;
}

export function parseAIProviderEnv(input: EnvInput): AIProviderConfiguration {
  const rawProvider = input.AI_PROVIDER?.trim() || "deepseek";
  const provider = providerSchema.safeParse(rawProvider);
  if (!provider.success) {
    return { provider: "mock", fallbackReason: "unknown_provider" };
  }
  if (provider.data === "mock") return { provider: "mock" };
  if (provider.data === "deepseek") {
    return {
      provider: "deepseek",
      apiKey: requireValue(input.DEEPSEEK_API_KEY),
      model: input.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
    };
  }
  return {
    provider: "openai",
    apiKey: requireValue(input.OPENAI_API_KEY),
    model: input.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
  };
}

export function getAIProviderEnv() {
  return parseAIProviderEnv({
    AI_PROVIDER: process.env.AI_PROVIDER,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}
