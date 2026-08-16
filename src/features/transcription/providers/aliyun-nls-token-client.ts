import { createHmac, randomUUID } from "node:crypto";

import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";

const ALIYUN_NLS_TOKEN_URL =
  "https://nls-meta.cn-shanghai.aliyuncs.com/?";

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

function formatTimestamp(value: Date) {
  return value.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class AliyunNlsTokenClient {
  private readonly transport: AliyunNlsTokenTransport;
  private readonly now: () => Date;
  private readonly nonce: () => string;

  constructor(
    private readonly options: {
      accessKeyId: string;
      accessKeySecret: string;
      transport?: AliyunNlsTokenTransport;
      now?: () => Date;
      nonce?: () => string;
    },
  ) {
    this.transport =
      options.transport ??
      ((request) => fetch(request.url, { method: "POST", signal: request.signal }));
    this.now = options.now ?? (() => new Date());
    this.nonce = options.nonce ?? randomUUID;
  }

  async getToken(input?: { signal?: AbortSignal }) {
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

    let response: Response;
    try {
      response = await this.transport({
        url: `${ALIYUN_NLS_TOKEN_URL}${canonicalizedQuery}&Signature=${percentEncode(signature)}`,
        signal: input?.signal,
      });
    } catch (error) {
      throw new AliyunNlsTokenError(
        mapTransportFailure(error, input?.signal),
      );
    }
    if (!response.ok) {
      throw new AliyunNlsTokenError(mapHttpFailure(response.status));
    }

    try {
      const payload = (await response.json()) as AliyunNlsTokenResponse;
      const token = payload.Token?.Id;
      if (typeof token !== "string" || !token.trim()) {
        throw new AliyunNlsTokenError("provider_request_failed");
      }
      return token;
    } catch (error) {
      if (error instanceof AliyunNlsTokenError) throw error;
      throw new AliyunNlsTokenError("provider_request_failed");
    }
  }
}
