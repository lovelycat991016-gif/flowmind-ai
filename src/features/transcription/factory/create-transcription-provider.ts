import { getTranscriptionProviderEnv, type TranscriptionProviderConfiguration } from "@/shared/config/transcription-provider-env";

import { AliyunAsrTranscriptionProvider } from "../providers/aliyun-asr-transcription-provider";
import { AliyunNlsTokenClient } from "../providers/aliyun-nls-token-client";
import { OpenAIWhisperTranscriptionProvider } from "../providers/openai-whisper-provider";
import type { TranscriptionProvider } from "../providers/transcription-provider";

export function createTranscriptionProviderFromConfiguration(
  configuration: TranscriptionProviderConfiguration,
): TranscriptionProvider {
  if (configuration.provider === "aliyun") {
    return new AliyunAsrTranscriptionProvider({
      appKey: configuration.appKey,
      tokenClient: new AliyunNlsTokenClient(configuration),
    });
  }
  return new OpenAIWhisperTranscriptionProvider(configuration);
}

export function createTranscriptionProvider(): TranscriptionProvider {
  return createTranscriptionProviderFromConfiguration(
    getTranscriptionProviderEnv(),
  );
}
