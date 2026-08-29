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

const SAFE_TRANSPORT_ERROR_CODES = new Set([
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

type AliyunAsrTransportRequest = {
  url: string;
  headers: { "Content-Type": string };
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
  channel_id: number;
};

type AliyunFlashRecognizerResponse = {
  task_id: string;
  status: number;
  message: string;
  flash_result?: {
    duration: number;
    completed: boolean;
    sentences?: AliyunSentence[];
  };
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

function getContentType(response: Response) {
  return response.headers.get("content-type")?.split(";", 1)[0] ?? null;
}

function getContentLength(response: Response) {
  const value = response.headers.get("content-length");
  if (!value || !/^\d{1,20}$/.test(value)) return null;

  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

function getSafeResultKeys(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.keys(value)
    .filter((key) => /^[A-Za-z0-9_-]{1,64}$/.test(key))
    .slice(0, 20);
}

function getSafeValueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function getSafeFlashResultDiagnostic(payload: unknown) {
  const flashResult =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "flash_result" in payload
      ? payload.flash_result
      : undefined;
  const isFlashResultObject =
    flashResult !== null &&
    typeof flashResult === "object" &&
    !Array.isArray(flashResult);
  const flashResultHasSentences =
    isFlashResultObject && "sentences" in flashResult;
  const sentences = flashResultHasSentences
    ? flashResult.sentences
    : undefined;
  const sentenceArray = Array.isArray(sentences) ? sentences : null;

  return {
    flashResultType: getSafeValueType(flashResult),
    flashResultKeys: getSafeResultKeys(flashResult),
    flashResultHasSentences,
    flashResultSentenceCount: sentenceArray?.length ?? null,
    firstSentenceKeys: getSafeResultKeys(sentenceArray?.[0]),
  };
}

function getFileExtension(filename: string) {
  const extension = filename.match(/\.([A-Za-z0-9]{1,16})$/)?.[1];
  return extension?.toLowerCase() ?? null;
}

function getSafeErrorName(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "AbortError";
  }
  if (error instanceof TypeError) return "TypeError";
  return "UnknownError";
}

function getSafeTransportSummary(error: unknown, signal: AbortSignal | undefined) {
  if (
    signal?.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    return "abort";
  }
  if (error instanceof TypeError) return "network_error";
  return "unknown_provider_error";
}

function getSafeErrorCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const candidate =
    "Code" in payload
      ? payload.Code
      : "code" in payload
        ? payload.code
        : "ErrorCode" in payload
          ? payload.ErrorCode
          : "errorCode" in payload
            ? payload.errorCode
            : undefined;
  return typeof candidate === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(candidate)
    ? candidate
    : undefined;
}

function getSafeTransportErrorCode(error: unknown) {
  const errorCode = getSafeErrorCode(error);
  return errorCode && SAFE_TRANSPORT_ERROR_CODES.has(errorCode)
    ? errorCode
    : undefined;
}

function getSafeResponseString(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== "object") return undefined;

  for (const key of keys) {
    if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
      return payload[key as keyof typeof payload] as string;
    }
  }
  return undefined;
}

function getSafeResponseMessage(payload: unknown, token: string) {
  const message = getSafeResponseString(payload, ["Message", "message"]);
  if (!message) return undefined;

  return (token ? message.replaceAll(token, "[redacted]") : message)
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(
      /\b(?:token|access[_ -]?key(?:id|secret)?|secret|authorization|cookie|signature)\b\s*(?:=|:)\s*[^\s,;]+/gi,
      (value) => `${value.split(/(?:=|:)/)[0]}=[redacted]`,
    )
    .slice(0, 500);
}

function getSafeResponseRequestId(payload: unknown, keys: string[]) {
  const requestId = getSafeResponseString(payload, keys);
  return requestId && /^[A-Za-z0-9_.:-]{1,200}$/.test(requestId)
    ? requestId
    : undefined;
}

async function getResponseErrorDiagnostic(response: Response, token: string) {
  if (getContentType(response) !== "application/json") return undefined;
  try {
    const payload = await response.clone().json();
    const code = getSafeErrorCode(payload);
    const message = getSafeResponseMessage(payload, token);
    const requestId = getSafeResponseRequestId(payload, [
      "RequestId",
      "requestId",
    ]);
    const request_id = getSafeResponseRequestId(payload, ["request_id"]);
    return {
      ...(code ? { code } : {}),
      ...(message ? { message } : {}),
      ...(requestId ? { requestId } : {}),
      ...(request_id ? { request_id } : {}),
      status: response.status,
    };
  } catch {
    return { status: response.status };
  }
}

function mapResponse(
  response: AliyunFlashRecognizerResponse,
  language: string | undefined,
) {
  const sentences = response.flash_result?.sentences;
  const result = transcriptionResultSchema.safeParse({
    provider: "aliyun",
    providerModel: "flash-recognizer",
    language: language ?? null,
    content: sentences
      ?.map((sentence) => sentence.text?.trim())
      .filter(Boolean)
      .join("\n"),
    segments: sentences?.map((sentence, segmentIndex) => ({
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
    const correlationId = input.correlationId ?? "unavailable";
    const audioBytes = new Uint8Array(input.bytes.length);
    audioBytes.set(input.bytes);
    url.searchParams.set("appkey", this.options.appKey);
    url.searchParams.set(
      "format",
      input.mimeType === "audio/mpeg"
        ? "mp3"
        : (input.mimeType.split("/")[1] ?? "wav"),
    );
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
    url.searchParams.set("token", token);

    console.info("ALIYUN_ASR_REQUEST_STARTED", {
      correlationId,
      operation: "FlashRecognizer",
      endpointHost: url.host,
      mimeType: input.mimeType,
      audioBytes: input.bytes.byteLength,
      fileExtension: getFileExtension(input.filename),
      abortSignalAborted: input.signal?.aborted ?? false,
    });

    let response: Response;
    let transportError: unknown;
    try {
      console.info("ALIYUN_ASR_FETCH_DISPATCHED", {
        correlationId,
        endpointHost: url.host,
        abortSignalAborted: input.signal?.aborted ?? false,
      });
      response = await this.transport({
        url: url.toString(),
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: audioBytes.buffer as ArrayBuffer,
        signal: input.signal,
      });
    } catch (error) {
      transportError = error;
      console.error("ALIYUN_ASR_REQUEST_FAILED", {
        correlationId,
        errorName: getSafeErrorName(error),
        errorSummary: getSafeTransportSummary(error, input.signal),
        abortSignalAborted: input.signal?.aborted ?? false,
      });
      throw new AliyunAsrProviderError(mapTransportFailure(error));
    } finally {
      const errorCode = getSafeTransportErrorCode(transportError);
      console.info("ALIYUN_ASR_REQUEST_SETTLED", {
        correlationId,
        endpointHost: url.host,
        settled: true,
        abortSignalAborted: input.signal?.aborted ?? false,
        ...(transportError
          ? { errorName: getSafeErrorName(transportError) }
          : {}),
        ...(errorCode ? { errorCode } : {}),
        safeSummary: transportError
          ? getSafeTransportSummary(transportError, input.signal)
          : "response_received",
      });
    }

    const contentType = getContentType(response);
    const aborted = input.signal?.aborted ?? false;
    console.info("ALIYUN_ASR_RESPONSE_RECEIVED", {
      correlationId,
      status: response.status,
      ok: response.ok,
      contentType,
      contentLength: getContentLength(response),
      aborted,
    });
    console.info("ALIYUN_ASR_RESPONSE", {
      correlationId,
      status: response.status,
      contentType,
      ok: response.ok,
      abortSignalAborted: aborted,
    });
    if (!response.ok) {
      const errorBody = await getResponseErrorDiagnostic(response, token);
      if (errorBody) {
        console.error("ALIYUN_ASR_ERROR_BODY", errorBody);
      }
      console.error("ALIYUN_ASR_HTTP_FAILED", {
        correlationId,
        status: response.status,
        contentType,
        errorCode: errorBody?.code,
        errorName: "AliyunAsrHttpError",
        errorSummary: `http_${response.status}`,
      });
      throw new AliyunAsrProviderError(mapHttpFailure(response.status));
    }

    let payload: AliyunFlashRecognizerResponse;
    try {
      payload = (await response.json()) as AliyunFlashRecognizerResponse;
    } catch {
      console.error("ALIYUN_ASR_RESPONSE_PARSE_FAILED", {
        correlationId,
        status: response.status,
        contentType,
        errorName: "InvalidAsrResponse",
        errorSummary: "invalid_json",
        safeSummary: "invalid_json",
      });
      throw new AliyunAsrProviderError("provider_request_failed");
    }

    try {
      const result = mapResponse(payload, input.language);
      console.info("ALIYUN_ASR_TRANSCRIPTION_COMPLETED", {
        correlationId,
        status: response.status,
        transcriptLength: result.content.length,
      });
      return result;
    } catch (error) {
      if (error instanceof AliyunAsrProviderError) {
        const flashResultDiagnostic = getSafeFlashResultDiagnostic(payload);
        console.error("ALIYUN_ASR_INVALID_RESULT", {
          correlationId,
          status: response.status,
          contentType,
          errorName: "InvalidAsrResult",
          errorSummary: "missing_valid_transcript",
          resultKeys: getSafeResultKeys(payload),
          ...flashResultDiagnostic,
          safeSummary: "missing_valid_transcript",
        });
        throw error;
      }
      throw new AliyunAsrProviderError("provider_request_failed");
    }
  }
}
