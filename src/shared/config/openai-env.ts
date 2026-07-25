import process from "node:process";

import { z } from "zod";

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).optional(),
});

type OpenAIEnvInput = Record<string, string | undefined>;

export type OpenAIEnv = {
  apiKey: string;
  model: string;
};

export function parseOpenAIEnv(input: OpenAIEnvInput): OpenAIEnv {
  const result = openAIEnvSchema.safeParse(input);
  if (!result.success) {
    throw new Error("OpenAI environment configuration is invalid.");
  }

  return {
    apiKey: result.data.OPENAI_API_KEY,
    model: result.data.OPENAI_MODEL ?? "gpt-4.1-mini",
  };
}

export function getOpenAIEnv() {
  return parseOpenAIEnv({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}
