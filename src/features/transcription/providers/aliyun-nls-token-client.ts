import { createHmac, randomUUID } from "node:crypto";

import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";

const ALIYUN_NLS_TOKEN_URL =
  "https://nls-meta.cn-shanghai.aliyuncs.com/?";
const ALIYUN_NLS_TOKEN_HOST = "nls-meta.cn-shanghai.aliyuncs.com";

type AliyunNlsTokenTransportRequest = {
  url: string;
  signal?: AbortSignal;
};

export type AliyunNlsTokenTransport = (
  request: AliyunNlsTokenTransportRequest,
) => Promise<Response>;

type AliyunNlsTokenResponse = { Token?: { Id?: unknown } };

export class AliyunNlsTokenError extends Error {
  constructor(readonly code: TranscriptionFailureCode) {
    super("Unable to obtain Aliyun ASR token.");
    this.name = "AliyunNlsTokenError";
  }
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function mapHttpFailure(status: number): TranscriptionFailureCode {
  if (status === 429) return "provider_rate_limited";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status >= 500) return "provider_unavailable";
  return "provider_request_failed";
}

function mapTransportFailure(
  error: unknown,
  signal: AbortSignal | undefined,
): TranscriptionFailureCode {
  if (
    signal?.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    return "provider_timeout";
  }
  return "provider_request_failed";
}

function getContentType(response: Response) {
  return response.headers.get("content-type")?.split(";", 1)[0] ?? null;
}

function getSafeErrorName(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "AbortError";
  }
  if (error instanceof TypeError) return "TypeError";
  return "UnknownError";
}

function getSafeTransportSummary(
  error: unknown,
  signal: AbortSignal | undefined,
) {
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

async function getResponseErrorCode(response: Response) {
  if (getContentType(response) !== "application/json") return undefined;
  try {
    return getSafeErrorCode(await response.clone().json());
  } catch {
    return undefined;
  }
}

function formatTimestamp(value: Date) {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class AliyunNlsTokenClient {
  private readonly transport: AliyunNlsTokenTransport;
  private readonly now: () => Date;
  private readonly latencyNow: () => number;
  private readonly nonce: () => string;

  constructor(
    private readonly options: {
      accessKeyId: string;
      accessKeySecret: string;
      transport?: AliyunNlsTokenTransport;
      now?: () => Date;
      latencyNow?: () => number;
      nonce?: () => string;
    },
  ) {
    this.transport =
      options.transport ??
      ((request) => fetch(request.url, { method: "POST", signal: request.signal }));
    this.now = options.now ?? (() => new Date());
    this.latencyNow = options.latencyNow ?? Date.now;
    this.nonce = options.nonce ?? randomUUID;
  }

  async getToken(input?: { signal?: AbortSignal; correlationId?: string }) {
    const parameters = {
      AccessKeyId: this.options.accessKeyId,
      Action: "CreateToken",
      Format: "JSON",
      RegionId: "cn-shanghai",
      SignatureMethod: "HMAC-SHA1",
      SignatureNonce: this.nonce(),
      SignatureVersion: "1.0",
      Timestamp: formatTimestamp(this.now()),
      Version: "2019-02-28",
    };
    const canonicalizedQuery = Object.entries(parameters)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
      .join("&");
    const stringToSign = `POST&%2F&${percentEncode(canonicalizedQuery)}`;
    const signature = createHmac("sha1", `${this.options.accessKeySecret}&`)
      .update(stringToSign)
      .digest("base64");

    const correlationId = input?.correlationId ?? "unavailable";
    const tokenStartedAtMs = this.latencyNow();
    console.info("ALIYUN_NLS_TOKEN_REQUEST_STARTED", {
      correlationId,
      operation: "CreateToken",
      endpointHost: ALIYUN_NLS_TOKEN_HOST,
    });

    let response: Response;
    try {
      response = await this.transport({
        url: `${ALIYUN_NLS_TOKEN_URL}${canonicalizedQuery}&Signature=${percentEncode(signature)}`,
        signal: input?.signal,
      });
    } catch (error) {
      console.error("ALIYUN_NLS_TOKEN_FAILED", {
        errorName: getSafeErrorName(error),
        errorSummary: getSafeTransportSummary(error, input?.signal),
      });
      throw new AliyunNlsTokenError(
        mapTransportFailure(error, input?.signal),
      );
    }
    const contentType = getContentType(response);
    console.info("ALIYUN_NLS_TOKEN_RESPONSE", {
      correlationId,
      status: response.status,
      contentType,
      ok: response.ok,
      tokenLatencyMs: Math.max(0, this.latencyNow() - tokenStartedAtMs),
    });
    if (!response.ok) {
      console.error("ALIYUN_NLS_TOKEN_FAILED", {
        status: response.status,
        contentType,
        errorCode: await getResponseErrorCode(response),
        errorName: "AliyunNlsTokenHttpError",
        errorSummary: `http_${response.status}`,
      });
      throw new AliyunNlsTokenError(mapHttpFailure(response.status));
    }

    try {
      const payload = (await response.json()) as AliyunNlsTokenResponse;
      const token = payload.Token?.Id;
      if (typeof token !== "string" || !token.trim()) {
        console.error("ALIYUN_NLS_TOKEN_FAILED", {
          status: response.status,
          contentType,
          errorName: "InvalidTokenResponse",
          errorSummary: "missing_token_id",
        });
        throw new AliyunNlsTokenError("provider_request_failed");
      }
      return token;
    } catch (error) {
      if (error instanceof AliyunNlsTokenError) throw error;
      console.error("ALIYUN_NLS_TOKEN_FAILED", {
        status: response.status,
        contentType,
        errorName: "InvalidTokenResponse",
        errorSummary: "invalid_json",
      });
      throw new AliyunNlsTokenError("provider_request_failed");
    }
  }
}
