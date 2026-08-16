import { describe, expect, it } from "vitest";

import { AliyunAsrTranscriptionProvider } from "../providers/aliyun-asr-transcription-provider";
import { OpenAIWhisperTranscriptionProvider } from "../providers/openai-whisper-provider";
import { createTranscriptionProviderFromConfiguration } from "./create-transcription-provider";

describe("createTranscriptionProviderFromConfiguration", () => {
  it("preserves OpenAI Whisper as the default-compatible provider", () => {
    expect(
      createTranscriptionProviderFromConfiguration({
        provider: "openai",
        apiKey: "openai-key",
      }),
    ).toBeInstanceOf(OpenAIWhisperTranscriptionProvider);
  });

  it("creates Aliyun ASR without exposing it to the cron route", () => {
    expect(
      createTranscriptionProviderFromConfiguration({
        provider: "aliyun",
        appKey: "app-key",
        accessKeyId: "access-key-id",
        accessKeySecret: "access-key-secret",
      }),
    ).toBeInstanceOf(AliyunAsrTranscriptionProvider);
  });
});
