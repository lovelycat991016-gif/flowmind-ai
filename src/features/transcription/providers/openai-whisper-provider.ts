import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";
import { transcriptionResultSchema } from "@/features/transcription/schemas/transcription-input";

import type {
  TranscriptionProvider,
  TranscriptionRequest,
} from "./transcription-provider";

const OPENAI_TRANSCRIPTIONS_URL =
  "https://api.openai.com/v1/audio/transcriptions";

type WhisperTransportRequest = {
  url: string;
  headers: { Authorization: string };
  body: FormData;
};

export type WhisperTransport = (
  request: WhisperTransportRequest,
) => Promise<Response>;

type OpenAIWhisperTranscriptionProviderOptions = {
  apiKey: string;
  transport?: WhisperTransport;
};

type WhisperSegment = {
  start: number;
  end: number;
  text: string;
};

type WhisperVerboseResponse = {
  text: string;
  language?: string;
  segments?: WhisperSegment[];
};

export class WhisperProviderError extends Error {
  constructor(readonly code: TranscriptionFailureCode) {
    super("Unable to transcribe recording.");
    this.name = "WhisperProviderError";
  }
}

function mapHttpFailure(status: number): TranscriptionFailureCode {
  if (status === 429) return "provider_rate_limited";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status >= 500) return "provider_unavailable";
  if ([400, 413, 415, 422].includes(status)) return "provider_rejected_audio";
  return "provider_request_failed";
}

function mapTransportFailure(error: unknown): TranscriptionFailureCode {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "provider_timeout";
  }

  return "provider_request_failed";
}

function toMilliseconds(value: number) {
  return Math.round(value * 1000);
}

function mapWhisperResponse(response: WhisperVerboseResponse) {
  const result = transcriptionResultSchema.safeParse({
    provider: "openai",
    providerModel: "whisper-1",
    language: response.language?.trim() || null,
    content: response.text?.trim(),
    segments: response.segments?.map((segment, segmentIndex) => ({
      segmentIndex,
      startMs: toMilliseconds(segment.start),
      endMs: toMilliseconds(segment.end),
      content: segment.text?.trim(),
    })),
  });

  if (!result.success) {
    throw new WhisperProviderError("provider_request_failed");
  }

  return result.data;
}

export class OpenAIWhisperTranscriptionProvider implements TranscriptionProvider {
  private readonly transport: WhisperTransport;

  constructor(
    private readonly options: OpenAIWhisperTranscriptionProviderOptions,
  ) {
    this.transport =
      options.transport ??
      ((request) =>
        fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
        }));
  }

  async transcribe(input: TranscriptionRequest) {
    const audioBytes = new Uint8Array(input.bytes.length);
    audioBytes.set(input.bytes);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBytes.buffer], { type: input.mimeType }),
      input.filename,
    );
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");
    if (input.language) formData.append("language", input.language);

    let response: Response;
    try {
      response = await this.transport({
        url: OPENAI_TRANSCRIPTIONS_URL,
        headers: { Authorization: `Bearer ${this.options.apiKey}` },
        body: formData,
      });
    } catch (error) {
      throw new WhisperProviderError(mapTransportFailure(error));
    }

    if (!response.ok) {
      throw new WhisperProviderError(mapHttpFailure(response.status));
    }

    try {
      return mapWhisperResponse(
        (await response.json()) as WhisperVerboseResponse,
      );
    } catch (error) {
      if (error instanceof WhisperProviderError) throw error;
      throw new WhisperProviderError("provider_request_failed");
    }
  }
}
