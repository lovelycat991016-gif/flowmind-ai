import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";
import { transcriptionResultSchema } from "@/features/transcription/schemas/transcription-input";

import type {
  TranscriptionProvider,
  TranscriptionRequest,
} from "./transcription-provider";
import {
  AliyunNlsTokenClient,
  AliyunNlsTokenError,
} from "./aliyun-nls-token-client";

const ALIYUN_FLASH_RECOGNIZER_URL =
  "https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/FlashRecognizer";

type AliyunAsrTransportRequest = {
  url: string;
  headers: { "Content-Type": string; "X-NLS-Token": string };
  body: ArrayBuffer;
  signal?: AbortSignal;
};

export type AliyunAsrTransport = (
  request: AliyunAsrTransportRequest,
) => Promise<Response>;

type AliyunSentence = {
  begin_time: number;
  end_time: number;
  text: string;
};

type AliyunFlashRecognizerResponse = {
  result?: string;
  sentences?: AliyunSentence[];
};

export class AliyunAsrProviderError extends Error {
  constructor(readonly code: TranscriptionFailureCode) {
    super("Unable to transcribe recording.");
    this.name = "AliyunAsrProviderError";
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

function mapResponse(
  response: AliyunFlashRecognizerResponse,
  language: string | undefined,
) {
  const result = transcriptionResultSchema.safeParse({
    provider: "aliyun",
    providerModel: "flash-recognizer",
    language: language ?? null,
    content: response.result?.trim(),
    segments: response.sentences?.map((sentence, segmentIndex) => ({
      segmentIndex,
      startMs: sentence.begin_time,
      endMs: sentence.end_time,
      content: sentence.text?.trim(),
    })),
  });
  if (!result.success) {
    throw new AliyunAsrProviderError("provider_request_failed");
  }
  return result.data;
}

export class AliyunAsrTranscriptionProvider implements TranscriptionProvider {
  private readonly transport: AliyunAsrTransport;

  constructor(
    private readonly options: {
      appKey: string;
      tokenClient: Pick<AliyunNlsTokenClient, "getToken">;
      transport?: AliyunAsrTransport;
    },
  ) {
    this.transport =
      options.transport ??
      ((request) =>
        fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          signal: request.signal,
        }));
  }

  async transcribe(input: TranscriptionRequest) {
    const url = new URL(ALIYUN_FLASH_RECOGNIZER_URL);
    const audioBytes = new Uint8Array(input.bytes.length);
    audioBytes.set(input.bytes);
    url.searchParams.set("appkey", this.options.appKey);
    url.searchParams.set("format", input.mimeType.split("/")[1] ?? "wav");
    if (input.language) url.searchParams.set("language", input.language);

    let token: string;
    try {
      token = await this.options.tokenClient.getToken({ signal: input.signal });
    } catch (error) {
      if (error instanceof AliyunNlsTokenError) {
        throw new AliyunAsrProviderError(error.code);
      }
      throw new AliyunAsrProviderError("provider_request_failed");
    }

    let response: Response;
    try {
      response = await this.transport({
        url: url.toString(),
        headers: {
          "Content-Type": input.mimeType,
          "X-NLS-Token": token,
        },
        body: audioBytes.buffer as ArrayBuffer,
        signal: input.signal,
      });
    } catch (error) {
      throw new AliyunAsrProviderError(mapTransportFailure(error));
    }

    if (!response.ok) {
      throw new AliyunAsrProviderError(mapHttpFailure(response.status));
    }

    try {
      return mapResponse(
        (await response.json()) as AliyunFlashRecognizerResponse,
        input.language,
      );
    } catch (error) {
      if (error instanceof AliyunAsrProviderError) throw error;
      throw new AliyunAsrProviderError("provider_request_failed");
    }
  }
}
