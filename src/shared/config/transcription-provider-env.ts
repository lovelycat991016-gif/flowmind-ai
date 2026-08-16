import process from "node:process";

import { z } from "zod";

type EnvInput = Record<string, string | undefined>;

export type TranscriptionProviderConfiguration =
  | { provider: "openai"; apiKey: string }
  | {
      provider: "aliyun";
      appKey: string;
      accessKeyId: string;
      accessKeySecret: string;
    };

function requireValue(value: string | undefined) {
  const parsed = z.string().trim().min(1).safeParse(value);
  if (!parsed.success) {
    throw new Error("Transcription provider configuration is invalid.");
  }
  return parsed.data;
}

export function parseTranscriptionProviderEnv(
  input: EnvInput,
): TranscriptionProviderConfiguration {
  const provider = input.TRANSCRIPTION_PROVIDER?.trim() || "openai";
  if (provider === "openai") {
    return { provider, apiKey: requireValue(input.OPENAI_API_KEY) };
  }
  if (provider === "aliyun") {
    return {
      provider,
      appKey: requireValue(input.ALIYUN_ASR_APP_KEY),
      accessKeyId: requireValue(input.ALIYUN_ACCESS_KEY_ID),
      accessKeySecret: requireValue(input.ALIYUN_ACCESS_KEY_SECRET),
    };
  }
  throw new Error("Transcription provider configuration is invalid.");
}

export function getTranscriptionProviderEnv() {
  return parseTranscriptionProviderEnv({
    TRANSCRIPTION_PROVIDER: process.env.TRANSCRIPTION_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ALIYUN_ASR_APP_KEY: process.env.ALIYUN_ASR_APP_KEY,
    ALIYUN_ACCESS_KEY_ID: process.env.ALIYUN_ACCESS_KEY_ID,
    ALIYUN_ACCESS_KEY_SECRET: process.env.ALIYUN_ACCESS_KEY_SECRET,
  });
}
