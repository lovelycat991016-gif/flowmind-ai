import { describe, expect, it, vi } from "vitest";

import { createScheduledHandler } from "./index";
import {
  ENDPOINTS,
  MAX_RESPONSE_BODY_BYTES,
  invokeEndpoint,
  runSchedulerRelay,
  type FetchLike,
  type RelayDependencies,
  type SafeLogEntry,
} from "./relay";

const CRON_SECRET = "test-cron-secret";

function jsonResponse(
  body: unknown = { status: "idle" },
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function byteStreamResponse(
  body: string,
  onBytesConsumed: (byteLength: number) => void = () => undefined,
): Response {
  const bytes = new TextEncoder().encode(body);
  let offset = 0;

  const stream = new ReadableStream({
    type: "bytes",
    pull(controller) {
      if (offset === bytes.byteLength) {
        controller.close();
        return;
      }

      const byobRequest = controller.byobRequest;
      if (byobRequest) {
        const view = byobRequest.view;
        if (!view) throw new Error("Expected an active BYOB request view");

        const target = new Uint8Array(
          view.buffer,
          view.byteOffset,
          view.byteLength,
        );
        const byteLength = Math.min(
          target.byteLength,
          bytes.byteLength - offset,
        );
        target.set(bytes.subarray(offset, offset + byteLength));
        offset += byteLength;
        onBytesConsumed(byteLength);
        byobRequest.respond(byteLength);
        if (offset === bytes.byteLength) controller.close();
        return;
      }

      const remaining = bytes.slice(offset);
      offset = bytes.byteLength;
      onBytesConsumed(remaining.byteLength);
      controller.enqueue(remaining);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function responseWithBodyStreamError(error: Error): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      type: "bytes",
      start(controller) {
        controller.error(error);
      },
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

function jsonBodyWithExactByteLength(byteLength: number): string {
  const prefix = '{"processedJobCount":2,"padding":"';
  const suffix = '"}';
  return `${prefix}${"x".repeat(byteLength - prefix.length - suffix.length)}${suffix}`;
}

function createHarness(
  fetch: FetchLike,
  overrides: Partial<RelayDependencies> = {},
) {
  const logs: SafeLogEntry[] = [];
  let now = 0;
  const dependencies: RelayDependencies = {
    fetch,
    log: (entry) => logs.push(entry),
    now: () => now++,
    sleep: vi.fn(async () => undefined),
    endpointTimeoutMs: 20,
    retryDelayMs: 1,
    ...overrides,
  };

  return { dependencies, logs };
}

function successfulFetch() {
  return vi.fn<FetchLike>(async () => jsonResponse());
}

describe("Cloudflare scheduler relay", () => {
  it("calls both production endpoints with GET", async () => {
    const fetch = successfulFetch();
    const { dependencies } = createHarness(fetch);

    await runSchedulerRelay(CRON_SECRET, dependencies);

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://flowmind-ai-liard.vercel.app/api/cron/transcription",
      "https://flowmind-ai-liard.vercel.app/api/cron/meeting-intelligence",
    ]);
    expect(fetch.mock.calls.every(([, init]) => init.method === "GET")).toBe(
      true,
    );
  });

  it("starts both endpoint calls before either one settles", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    const started: string[] = [];
    const fetch = vi.fn<FetchLike>(
      (url) =>
        new Promise((resolve) => {
          started.push(url);
          resolvers.push(resolve);
        }),
    );
    const { dependencies } = createHarness(fetch);

    const relayPromise = runSchedulerRelay(CRON_SECRET, dependencies);
    await vi.waitFor(() => expect(started).toHaveLength(2));

    expect(started).toEqual([
      ENDPOINTS.transcription.url,
      ENDPOINTS.meetingIntelligence.url,
    ]);
    resolvers.forEach((resolve) => resolve(jsonResponse()));
    await relayPromise;
  });

  it("allows meeting intelligence to finish when transcription fails", async () => {
    const fetch = vi.fn<FetchLike>(async (url) => {
      if (url === ENDPOINTS.transcription.url) throw new TypeError("network");
      return jsonResponse();
    });
    const { dependencies } = createHarness(fetch);

    const result = await runSchedulerRelay(CRON_SECRET, dependencies);

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint: "transcription", ok: false }),
        expect.objectContaining({ endpoint: "meeting-intelligence", ok: true }),
      ]),
    );
    expect(
      fetch.mock.calls.filter(
        ([url]) => url === ENDPOINTS.meetingIntelligence.url,
      ),
    ).toHaveLength(1);
  });

  it("allows transcription to finish when meeting intelligence fails", async () => {
    const fetch = vi.fn<FetchLike>(async (url) => {
      if (url === ENDPOINTS.meetingIntelligence.url) {
        throw new TypeError("network");
      }
      return jsonResponse();
    });
    const { dependencies } = createHarness(fetch);

    const result = await runSchedulerRelay(CRON_SECRET, dependencies);

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ endpoint: "transcription", ok: true }),
        expect.objectContaining({
          endpoint: "meeting-intelligence",
          ok: false,
        }),
      ]),
    );
    expect(
      fetch.mock.calls.filter(([url]) => url === ENDPOINTS.transcription.url),
    ).toHaveLength(1);
  });

  it("does not retry a successful 2xx response", async () => {
    const fetch = successfulFetch();
    const { dependencies } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry HTTP 401", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({}, 401));
    const { dependencies } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry HTTP 403", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({}, 403));
    const { dependencies } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry another deterministic 4xx response", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({}, 400));
    const { dependencies } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([408, 429, 500, 502, 503, 504])(
    "retries HTTP %s once",
    async (status) => {
      const fetch = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(jsonResponse({}, status))
        .mockResolvedValueOnce(jsonResponse());
      const { dependencies } = createHarness(fetch);

      const result = await invokeEndpoint(
        ENDPOINTS.transcription,
        CRON_SECRET,
        dependencies,
      );

      expect(result.ok).toBe(true);
      expect(result.attempt).toBe(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("retries a network error once", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(jsonResponse());
    const { dependencies } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries when response body stream fails after HTTP headers", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        responseWithBodyStreamError(new TypeError("body network failure")),
      )
      .mockResolvedValueOnce(jsonResponse({ processedJobCount: 2 }));
    const { dependencies, logs } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: true, attempt: 2, httpStatus: 200 }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logs[0]).toEqual(
      expect.objectContaining({
        event: "scheduler_endpoint_error",
        attempt: 1,
        retry: true,
        errorType: "network_error",
      }),
    );
    expect(
      logs.some(
        (entry) =>
          entry.event === "scheduler_endpoint_result" && entry.attempt === 1,
      ),
    ).toBe(false);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({
        event: "scheduler_endpoint_result",
        attempt: 2,
        processedJobCount: 2,
      }),
    );
  });

  it("retries when response body times out after HTTP headers", async () => {
    const fetch = vi.fn<FetchLike>((_url, init) => {
      if (fetch.mock.calls.length > 1) {
        return Promise.resolve(jsonResponse({ stopReason: "queue_empty" }));
      }

      const stream = new ReadableStream<Uint8Array>({
        type: "bytes",
        pull(controller) {
          return new Promise<void>((resolve) => {
            init.signal?.addEventListener(
              "abort",
              () => {
                controller.error(new DOMException("aborted", "AbortError"));
                resolve();
              },
              { once: true },
            );
          });
        },
      });

      return Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    const { dependencies, logs } = createHarness(fetch, {
      endpointTimeoutMs: 1,
    });

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: true, attempt: 2, httpStatus: 200 }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logs[0]).toEqual(
      expect.objectContaining({
        event: "scheduler_endpoint_error",
        attempt: 1,
        retry: true,
        errorType: "timeout",
      }),
    );
    expect(
      logs.some(
        (entry) =>
          entry.event === "scheduler_endpoint_result" && entry.attempt === 1,
      ),
    ).toBe(false);
  });

  it("retries an endpoint timeout once", async () => {
    const fetch = vi.fn<FetchLike>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const { dependencies } = createHarness(fetch, { endpointTimeoutMs: 1 });

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: false, attempt: 2, errorType: "timeout" }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops after the second failed attempt", async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      throw new TypeError("network");
    });
    const { dependencies } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result.ok).toBe(false);
    expect(result.attempt).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sends the secret only as the Bearer authorization value", async () => {
    const fetch = successfulFetch();
    const { dependencies } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(fetch).toHaveBeenCalledWith(
      ENDPOINTS.transcription.url,
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      }),
    );
  });

  it("never includes the secret in structured logs", async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      throw new Error(`failed with ${CRON_SECRET}`);
    });
    const { dependencies, logs } = createHarness(fetch);

    await runSchedulerRelay(CRON_SECRET, dependencies);

    expect(JSON.stringify(logs)).not.toContain(CRON_SECRET);
    expect(JSON.stringify(logs)).not.toContain("Authorization");
  });

  it("does not retain or log an oversized response body", async () => {
    const sensitiveTail = "sensitive-response-tail";
    const body = `${"x".repeat(MAX_RESPONSE_BODY_BYTES + 1)}${sensitiveTail}`;
    const fetch = vi.fn<FetchLike>(
      async () =>
        new Response(body, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-length": String(body.length),
          },
        }),
    );
    const { dependencies, logs } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(JSON.stringify(logs)).not.toContain(sensitiveTail);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({
        processedJobCount: null,
        stopReason: null,
      }),
    );
  });

  it("reads a chunked response whose body is exactly 4096 bytes", async () => {
    const body = jsonBodyWithExactByteLength(MAX_RESPONSE_BODY_BYTES);
    let consumedBytes = 0;
    const fetch = vi.fn<FetchLike>(async () =>
      byteStreamResponse(body, (byteLength) => {
        consumedBytes += byteLength;
      }),
    );
    const { dependencies, logs } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(new TextEncoder().encode(body)).toHaveLength(
      MAX_RESPONSE_BODY_BYTES,
    );
    expect(consumedBytes).toBe(MAX_RESPONSE_BODY_BYTES);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({ processedJobCount: 2 }),
    );
  });

  it("does not consume more than the bounded sentinel from a chunked response", async () => {
    const body = jsonBodyWithExactByteLength(MAX_RESPONSE_BODY_BYTES + 128);
    let consumedBytes = 0;
    const fetch = vi.fn<FetchLike>(async () =>
      byteStreamResponse(body, (byteLength) => {
        consumedBytes += byteLength;
      }),
    );
    const { dependencies, logs } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    // The 4097th byte is a transport-only sentinel and is never retained.
    expect(consumedBytes).toBeLessThanOrEqual(MAX_RESPONSE_BODY_BYTES + 1);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({
        processedJobCount: null,
        stopReason: null,
      }),
    );
  });

  it("extracts a safe processedJobCount", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({ processedJobCount: 2 }),
    );
    const { dependencies, logs } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(logs.at(-1)).toEqual(
      expect.objectContaining({ processedJobCount: 2 }),
    );
  });

  it("extracts a known safe stopReason", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({ stopReason: "queue_empty" }),
    );
    const { dependencies, logs } = createHarness(fetch);

    await invokeEndpoint(ENDPOINTS.transcription, CRON_SECRET, dependencies);

    expect(logs.at(-1)).toEqual(
      expect.objectContaining({ stopReason: "queue_empty" }),
    );
  });

  it("does not fail a successful request with malformed JSON", async () => {
    const fetch = vi.fn<FetchLike>(
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const { dependencies, logs } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({
        processedJobCount: null,
        stopReason: null,
      }),
    );
  });

  it("does not fail a successful request with an empty body", async () => {
    const fetch = vi.fn<FetchLike>(
      async () =>
        new Response(null, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const { dependencies, logs } = createHarness(fetch);

    const result = await invokeEndpoint(
      ENDPOINTS.transcription,
      CRON_SECRET,
      dependencies,
    );

    expect(result.ok).toBe(true);
    expect(logs.at(-1)).toEqual(
      expect.objectContaining({
        processedJobCount: null,
        stopReason: null,
      }),
    );
  });

  it("emits independent endpoint metrics", async () => {
    const fetch = successfulFetch();
    const { dependencies, logs } = createHarness(fetch);

    await runSchedulerRelay(CRON_SECRET, dependencies);

    expect(
      logs.filter((entry) => entry.endpoint === "transcription"),
    ).toHaveLength(1);
    expect(
      logs.filter((entry) => entry.endpoint === "meeting-intelligence"),
    ).toHaveLength(1);
  });

  it("waits for both endpoint results before the scheduled handler settles", async () => {
    let resolveMeetingIntelligence: ((response: Response) => void) | undefined;
    const fetch = vi.fn<FetchLike>((url) => {
      if (url === ENDPOINTS.transcription.url) {
        return Promise.resolve(jsonResponse());
      }
      return new Promise((resolve) => {
        resolveMeetingIntelligence = resolve;
      });
    });
    const { dependencies } = createHarness(fetch);
    const handler = createScheduledHandler(dependencies);
    let settled = false;

    const scheduledPromise = handler
      .scheduled(
        { cron: "*/5 * * * *", scheduledTime: 0 },
        { CRON_SECRET },
        { waitUntil: vi.fn() },
      )
      .finally(() => {
        settled = true;
      });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(settled).toBe(false);
    resolveMeetingIntelligence?.(jsonResponse());
    await scheduledPromise;
    expect(settled).toBe(true);
  });

  it("reports failure only after collecting both endpoint outcomes", async () => {
    const fetch = vi.fn<FetchLike>(async (url) =>
      url === ENDPOINTS.transcription.url
        ? jsonResponse({}, 401)
        : jsonResponse(),
    );
    const { dependencies, logs } = createHarness(fetch);
    const handler = createScheduledHandler(dependencies);

    await expect(
      handler.scheduled(
        { cron: "*/5 * * * *", scheduledTime: 0 },
        { CRON_SECRET },
        { waitUntil: vi.fn() },
      ),
    ).rejects.toThrow("Scheduler relay failed for transcription");
    expect(
      logs.some((entry) => entry.endpoint === "meeting-intelligence"),
    ).toBe(true);
  });

  it("rejects missing CRON_SECRET without calling either endpoint", async () => {
    const fetch = successfulFetch();
    const { dependencies } = createHarness(fetch);
    const handler = createScheduledHandler(dependencies);

    await expect(
      handler.scheduled(
        { cron: "*/5 * * * *", scheduledTime: 0 },
        { CRON_SECRET: "" },
        { waitUntil: vi.fn() },
      ),
    ).rejects.toThrow("CRON_SECRET is not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});
