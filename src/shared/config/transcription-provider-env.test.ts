import { describe, expect, it } from "vitest";

import { parseTranscriptionProviderEnv } from "./transcription-provider-env";

describe("transcription provider environment", () => {
  it("defaults to the existing OpenAI Whisper provider", () => {
    expect(
      parseTranscriptionProviderEnv({ OPENAI_API_KEY: "openai-key" }),
    ).toEqual({ provider: "openai", apiKey: "openai-key" });
  });

  it("accepts the server-only Aliyun ASR configuration", () => {
    expect(
      parseTranscriptionProviderEnv({
        TRANSCRIPTION_PROVIDER: "aliyun",
        ALIYUN_ASR_APP_KEY: "app-key",
        ALIYUN_ACCESS_KEY_ID: "access-key-id",
        ALIYUN_ACCESS_KEY_SECRET: "access-key-secret",
      }),
    ).toEqual({
      provider: "aliyun",
      appKey: "app-key",
      accessKeyId: "access-key-id",
      accessKeySecret: "access-key-secret",
    });
  });

  it("rejects an Aliyun selection without all required credentials", () => {
    expect(() =>
      parseTranscriptionProviderEnv({
        TRANSCRIPTION_PROVIDER: "aliyun",
        ALIYUN_ASR_APP_KEY: "app-key",
        ALIYUN_ACCESS_KEY_ID: "access-key-id",
      }),
    ).toThrow("Transcription provider configuration is invalid.");
  });
});
