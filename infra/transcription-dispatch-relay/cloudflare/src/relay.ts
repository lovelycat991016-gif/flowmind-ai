export type EndpointName =
  "transcription" | "meeting-intelligence" | "meeting-knowledge";

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type RelayErrorType =
  "http_error" | "internal_error" | "network_error" | "timeout";

export interface EndpointDefinition {
  name: EndpointName;
  url: string;
}

export interface SafeLogEntry {
  event: "scheduler_endpoint_error" | "scheduler_endpoint_result";
  endpoint: EndpointName;
  attempt: number;
  latencyMs: number;
  httpStatus: number | null;
  processedJobCount: number | null;
  stopReason: string | null;
  retry: boolean;
  errorType?: RelayErrorType;
}

export interface EndpointResult {
  endpoint: EndpointName;
  ok: boolean;
  attempt: number;
  httpStatus: number | null;
  errorType?: RelayErrorType;
}

export interface RelayRunResult {
  results: EndpointResult[];
}

export interface RelayDependencies {
  fetch: FetchLike;
  log: (entry: SafeLogEntry) => void;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
  endpointTimeoutMs: number;
  retryDelayMs: number;
}

export const ENDPOINTS = {
  transcription: {
    name: "transcription",
    url: "https://flowmind-ai-liard.vercel.app/api/cron/transcription",
  },
  meetingIntelligence: {
    name: "meeting-intelligence",
    url: "https://flowmind-ai-liard.vercel.app/api/cron/meeting-intelligence",
  },
  meetingKnowledge: {
    name: "meeting-knowledge",
    url: "https://flowmind-ai-liard.vercel.app/api/cron/meeting-knowledge",
  },
} as const satisfies Record<string, EndpointDefinition>;

export const MAX_RESPONSE_BODY_BYTES = 4_096;

const MAX_ATTEMPTS = 2;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const SAFE_STOP_REASONS = new Set([
  "budget_exhausted",
  "job_limit_reached",
  "queue_empty",
]);

interface SafeBusinessSummary {
  processedJobCount: number | null;
  stopReason: string | null;
}

const EMPTY_BUSINESS_SUMMARY: SafeBusinessSummary = {
  processedJobCount: null,
  stopReason: null,
};

function latencySince(startedAt: number, now: () => number) {
  return Math.max(0, now() - startedAt);
}

function isTimeoutError(error: unknown, timedOut: boolean) {
  return (
    timedOut ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

async function discardBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The body is intentionally ignored; cancellation failures are non-fatal.
  }
}

async function cancelReader(reader: ReadableStreamBYOBReader) {
  try {
    await reader.cancel();
  } catch {
    // Cancellation after a deliberate bounded-read stop is best effort.
  }
}

async function readSafeBusinessSummary(
  response: Response,
): Promise<SafeBusinessSummary> {
  const contentType = response.headers.get("content-type")?.toLowerCase();
  if (!contentType?.includes("json") || !response.body) {
    await discardBody(response);
    return EMPTY_BUSINESS_SUMMARY;
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_RESPONSE_BODY_BYTES
  ) {
    await discardBody(response);
    return EMPTY_BUSINESS_SUMMARY;
  }

  let reader: ReadableStreamBYOBReader;
  try {
    reader = response.body.getReader({ mode: "byob" });
  } catch {
    await discardBody(response);
    return EMPTY_BUSINESS_SUMMARY;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const remainingWithSentinel = MAX_RESPONSE_BODY_BYTES + 1 - totalBytes;
      const { done, value } = await reader.read(
        new Uint8Array(remainingWithSentinel),
      );
      if (done) break;

      if (value.byteLength === 0) {
        await cancelReader(reader);
        return EMPTY_BUSINESS_SUMMARY;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BODY_BYTES) {
        await cancelReader(reader);
        return EMPTY_BUSINESS_SUMMARY;
      }

      chunks.push(value.slice());
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) return EMPTY_BUSINESS_SUMMARY;

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return EMPTY_BUSINESS_SUMMARY;
    }

    const record = parsed as Record<string, unknown>;
    const processedJobCount =
      Number.isSafeInteger(record.processedJobCount) &&
      Number(record.processedJobCount) >= 0
        ? Number(record.processedJobCount)
        : null;
    const stopReason =
      typeof record.stopReason === "string" &&
      SAFE_STOP_REASONS.has(record.stopReason)
        ? record.stopReason
        : null;

    return { processedJobCount, stopReason };
  } catch {
    return EMPTY_BUSINESS_SUMMARY;
  }
}

export async function invokeEndpoint(
  endpoint: EndpointDefinition,
  cronSecret: string,
  dependencies: RelayDependencies,
): Promise<EndpointResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = dependencies.now();
    const abortController = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abortController.abort();
    }, dependencies.endpointTimeoutMs);

    try {
      const response = await dependencies.fetch(endpoint.url, {
        method: "GET",
        headers: { Authorization: `Bearer ${cronSecret}` },
        signal: abortController.signal,
      });
      const isSuccess = response.status >= 200 && response.status < 300;
      const shouldRetry =
        attempt < MAX_ATTEMPTS && RETRYABLE_HTTP_STATUSES.has(response.status);
      const summary = isSuccess
        ? await readSafeBusinessSummary(response)
        : EMPTY_BUSINESS_SUMMARY;

      if (!isSuccess) await discardBody(response);

      dependencies.log({
        event: "scheduler_endpoint_result",
        endpoint: endpoint.name,
        attempt,
        latencyMs: latencySince(startedAt, dependencies.now),
        httpStatus: response.status,
        processedJobCount: summary.processedJobCount,
        stopReason: summary.stopReason,
        retry: shouldRetry,
        ...(isSuccess ? {} : { errorType: "http_error" as const }),
      });

      if (isSuccess) {
        return {
          endpoint: endpoint.name,
          ok: true,
          attempt,
          httpStatus: response.status,
        };
      }

      if (!shouldRetry) {
        return {
          endpoint: endpoint.name,
          ok: false,
          attempt,
          httpStatus: response.status,
          errorType: "http_error",
        };
      }
    } catch (error) {
      const errorType = isTimeoutError(error, timedOut)
        ? "timeout"
        : "network_error";
      const shouldRetry = attempt < MAX_ATTEMPTS;

      dependencies.log({
        event: "scheduler_endpoint_error",
        endpoint: endpoint.name,
        attempt,
        latencyMs: latencySince(startedAt, dependencies.now),
        httpStatus: null,
        processedJobCount: null,
        stopReason: null,
        retry: shouldRetry,
        errorType,
      });

      if (!shouldRetry) {
        return {
          endpoint: endpoint.name,
          ok: false,
          attempt,
          httpStatus: null,
          errorType,
        };
      }
    } finally {
      clearTimeout(timeout);
    }

    await dependencies.sleep(dependencies.retryDelayMs);
  }

  throw new Error("Unreachable scheduler relay state");
}

export async function runSchedulerRelay(
  cronSecret: string,
  dependencies: RelayDependencies,
): Promise<RelayRunResult> {
  const endpoints = [
    ENDPOINTS.transcription,
    ENDPOINTS.meetingIntelligence,
    ENDPOINTS.meetingKnowledge,
  ];
  const settledResults = await Promise.allSettled(
    endpoints.map((endpoint) =>
      invokeEndpoint(endpoint, cronSecret, dependencies),
    ),
  );

  const results = settledResults.map((settledResult, index): EndpointResult => {
    if (settledResult.status === "fulfilled") return settledResult.value;

    const endpoint = endpoints[index];
    dependencies.log({
      event: "scheduler_endpoint_error",
      endpoint: endpoint.name,
      attempt: 0,
      latencyMs: 0,
      httpStatus: null,
      processedJobCount: null,
      stopReason: null,
      retry: false,
      errorType: "internal_error",
    });

    return {
      endpoint: endpoint.name,
      ok: false,
      attempt: 0,
      httpStatus: null,
      errorType: "internal_error",
    };
  });

  return { results };
}
