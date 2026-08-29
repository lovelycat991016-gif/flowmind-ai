import { afterEach, describe, expect, it, vi } from "vitest";

import { AliyunAsrTranscriptionProvider } from "./aliyun-asr-transcription-provider";
import { AliyunNlsTokenError } from "./aliyun-nls-token-client";

const input = {
  filename: "weekly-sync.webm",
  mimeType: "audio/webm",
  bytes: new Uint8Array([97, 117, 100, 105, 111]),
  language: "zh",
  correlationId: "transcription-correlation:test-invocation",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("AliyunAsrTranscriptionProvider", () => {
  it("maps an Aliyun file recognition response into the provider-neutral result", async () => {
    const controller = new AbortController();
    const transport = vi.fn().mockResolvedValue(
      response({
        task_id: "task-123",
        status: 20000000,
        message: "SUCCESS",
        flash_result: {
          duration: 1200,
          completed: true,
          sentences: [
            {
              begin_time: 0,
              end_time: 1200,
              text: "Project status is on track.",
              channel_id: 0,
            },
          ],
        },
      }),
    );
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport,
    });

    await expect(
      provider.transcribe({
        ...input,
        filename: "weekly-sync.mp3",
        mimeType: "audio/mpeg",
        signal: controller.signal,
      }),
    ).resolves.toEqual({
      provider: "aliyun",
      providerModel: "flash-recognizer",
      language: "zh",
      content: "Project status is on track.",
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          content: "Project status is on track.",
        },
      ],
    });
    expect(transport).toHaveBeenCalledOnce();
    const request = transport.mock.calls[0]?.[0];
    const requestUrl = new URL(request.url);
    expect(requestUrl.searchParams.get("format")).toBe("mp3");
    expect(requestUrl.searchParams.get("token")).toBe("temporary-token");
    expect(request.headers["Content-Type"]).toBe("application/octet-stream");
    expect(request.headers).not.toHaveProperty("X-NLS-Token");
    expect(request.signal).toBe(controller.signal);
  });

  it("builds content and segments from FlashRecognizer sentences", async () => {
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({
          task_id: "task-456",
          status: 20000000,
          message: "SUCCESS",
          flash_result: {
            duration: 2500,
            completed: true,
            sentences: [
              {
                begin_time: 0,
                end_time: 1000,
                text: "First sentence.",
                channel_id: 0,
              },
              {
                begin_time: 1200,
                end_time: 2500,
                text: "Second sentence.",
                channel_id: 0,
              },
            ],
          },
        }),
      ),
    });

    await expect(provider.transcribe(input)).resolves.toEqual({
      provider: "aliyun",
      providerModel: "flash-recognizer",
      language: "zh",
      content: "First sentence.\nSecond sentence.",
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1000,
          content: "First sentence.",
        },
        {
          segmentIndex: 1,
          startMs: 1200,
          endMs: 2500,
          content: "Second sentence.",
        },
      ],
    });
  });

  it("maps caller cancellation to the existing provider timeout code", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const controller = new AbortController();
    controller.abort();
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockRejectedValue(new DOMException("", "AbortError")),
    });

    await expect(provider.transcribe({ ...input, signal: controller.signal })).rejects.toMatchObject({
      code: "provider_timeout",
    });
    expect(consoleInfo).toHaveBeenCalledWith("ALIYUN_ASR_REQUEST_SETTLED", {
      correlationId: input.correlationId,
      endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
      settled: true,
      abortSignalAborted: true,
      errorName: "AbortError",
      safeSummary: "abort",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_FAILED",
      expect.objectContaining({
        correlationId: input.correlationId,
        errorName: "AbortError",
        errorSummary: "abort",
        abortSignalAborted: true,
      }),
    );
  });

  it.each([
    [401, "provider_request_failed"],
    [403, "provider_request_failed"],
    [413, "provider_rejected_audio"],
    [415, "provider_rejected_audio"],
    [429, "provider_rate_limited"],
    [503, "provider_unavailable"],
  ])("maps ASR HTTP %i to the safe %s code", async (status, code) => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(response({}, status)),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({ code });
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_RECEIVED",
      expect.objectContaining({ status, ok: false, aborted: false }),
    );
  });

  it("maps token failures and malformed ASR output safely", async () => {
    const tokenFailure = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: {
        getToken: vi.fn().mockRejectedValue(new AliyunNlsTokenError("provider_unavailable")),
      },
    });
    const malformedResponse = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({
          task_id: "task-empty",
          status: 20000000,
          message: "SUCCESS",
          flash_result: {
            duration: 0,
            completed: true,
            sentences: [],
          },
        }),
      ),
    });

    await expect(tokenFailure.transcribe(input)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
    await expect(malformedResponse.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
  });

  it.each([
    {
      task_id: "task-missing-result",
      status: 20000000,
      message: "SUCCESS",
    },
    {
      task_id: "task-empty-sentences",
      status: 20000000,
      message: "SUCCESS",
      flash_result: {
        duration: 0,
        completed: true,
        sentences: [],
      },
    },
  ])(
    "fails safely when FlashRecognizer has no usable sentences",
    async (body) => {
      const provider = new AliyunAsrTranscriptionProvider({
        appKey: "app-key",
        tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
        transport: vi.fn().mockResolvedValue(response(body)),
      });

      await expect(provider.transcribe(input)).rejects.toMatchObject({
        code: "provider_request_failed",
      });
    },
  );

  it("logs safe request metadata and completion without exposing the token", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const now = vi
      .fn()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(76_033)
      .mockReturnValueOnce(76_040)
      .mockReturnValueOnce(76_044)
      .mockReturnValueOnce(76_045)
      .mockReturnValueOnce(76_047);
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({
          task_id: "task-safe-log",
          status: 20000000,
          message: "SUCCESS",
          flash_result: {
            duration: 1,
            completed: true,
            sentences: [
              {
                begin_time: 0,
                end_time: 1,
                text: "Safe transcript",
                channel_id: 0,
              },
            ],
          },
        }),
      ),
      now,
    });

    await provider.transcribe(input);

    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_STARTED",
      expect.objectContaining({
        correlationId: input.correlationId,
        operation: "FlashRecognizer",
        endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
        mimeType: input.mimeType,
        audioBytes: input.bytes.length,
        fileExtension: "webm",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_FETCH_DISPATCHED",
      expect.objectContaining({
        correlationId: input.correlationId,
        endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
        abortSignalAborted: false,
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_RECEIVED",
      expect.objectContaining({
        correlationId: input.correlationId,
        status: 200,
        ok: true,
        contentType: "application/json",
        contentLength: null,
        aborted: false,
        flashRecognizerFetchLatencyMs: 75_033,
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_JSON_PARSED",
      {
        correlationId: input.correlationId,
        responseJsonLatencyMs: 4,
      },
    );
    expect(consoleInfo).toHaveBeenCalledWith("ALIYUN_ASR_REQUEST_SETTLED", {
      correlationId: input.correlationId,
      endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
      settled: true,
      abortSignalAborted: false,
      safeSummary: "response_received",
    });
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_TRANSCRIPTION_COMPLETED",
      expect.objectContaining({
        correlationId: input.correlationId,
        status: 200,
        transcriptLength: 15,
        mapResponseLatencyMs: 2,
      }),
    );
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("temporary-token");
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain(
      "Safe transcript",
    );
  });

  it("logs a safe ASR HTTP 400 body without exposing reflected secrets", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response(
          {
            Code: "InvalidParameter",
            Message:
              "Invalid token=temporary-token at https://example.com/private?token=temporary-token",
            request_id: "request-123",
          },
          400,
        ),
      ),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({
      code: "provider_rejected_audio",
    });
    expect(consoleError).toHaveBeenCalledWith("ALIYUN_ASR_ERROR_BODY", {
      code: "InvalidParameter",
      message: "Invalid token=[redacted] at [redacted-url]",
      request_id: "request-123",
      status: 400,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_HTTP_FAILED",
      expect.objectContaining({
        correlationId: input.correlationId,
        status: 400,
        errorCode: "InvalidParameter",
        errorSummary: "http_400",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "temporary-token",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "https://example.com/private",
    );
  });

  it("logs safe diagnostics for invalid JSON and an invalid result", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const invalidJson = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        new Response("token=secret-token", {
          headers: { "content-type": "application/json" },
        }),
      ),
    });
    const missingResult = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({
          task_id: "task-invalid",
          status: 20000000,
          message: "SUCCESS",
          flash_result: {
            duration: 100,
            completed: true,
            sentences: [
              {
                begin_time: 100,
                end_time: 0,
                text: "sensitive transcript content",
                channel_id: 0,
              },
            ],
          },
        }),
      ),
    });

    await expect(invalidJson.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    await expect(missingResult.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_PARSE_FAILED",
      expect.objectContaining({
        correlationId: input.correlationId,
        status: 200,
        contentType: "application/json",
        errorName: "InvalidAsrResponse",
        safeSummary: "invalid_json",
      }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_INVALID_RESULT",
      expect.objectContaining({
        correlationId: input.correlationId,
        status: 200,
        resultKeys: ["task_id", "status", "message", "flash_result"],
        flashResultType: "object",
        flashResultKeys: ["duration", "completed", "sentences"],
        flashResultHasSentences: true,
        flashResultSentenceCount: 1,
        firstSentenceKeys: [
          "begin_time",
          "end_time",
          "text",
          "channel_id",
        ],
        safeSummary: "missing_valid_transcript",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sensitive transcript content",
    );
  });

  it.each([
    {
      label: "undefined",
      body: {
        task_id: "task-no-flash-result",
        status: 20000000,
        message: "SUCCESS",
      },
      expectedType: "undefined",
    },
    {
      label: "null",
      body: {
        task_id: "task-null-flash-result",
        status: 20000000,
        message: "SUCCESS",
        flash_result: null,
      },
      expectedType: "null",
    },
    {
      label: "non-object",
      body: {
        task_id: "task-string-flash-result",
        status: 20000000,
        message: "SUCCESS",
        flash_result: "sensitive transcript content",
      },
      expectedType: "string",
    },
  ])(
    "logs safe flash_result diagnostics when it is $label",
    async ({ body, expectedType }) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const provider = new AliyunAsrTranscriptionProvider({
        appKey: "app-key",
        tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
        transport: vi.fn().mockResolvedValue(response(body)),
      });

      await expect(provider.transcribe(input)).rejects.toMatchObject({
        code: "provider_request_failed",
      });
      expect(consoleError).toHaveBeenCalledWith(
        "ALIYUN_ASR_INVALID_RESULT",
        expect.objectContaining({
          flashResultType: expectedType,
          flashResultKeys: [],
          flashResultHasSentences: false,
          flashResultSentenceCount: null,
          firstSentenceKeys: [],
        }),
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
        "sensitive transcript content",
      );
    },
  );

  it("records a non-JSON FlashRecognizer response without logging its body", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        new Response("token=secret-token", {
          headers: {
            "content-length": "18",
            "content-type": "text/plain",
          },
        }),
      ),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_RECEIVED",
      expect.objectContaining({
        status: 200,
        ok: true,
        contentType: "text/plain",
        contentLength: 18,
        aborted: false,
      }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_PARSE_FAILED",
      expect.objectContaining({ safeSummary: "invalid_json" }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });

  it("logs settled and failed diagnostics for a network exception", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const networkFailure = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockRejectedValue(
        Object.assign(new TypeError("network secret-token"), {
          code: "temporary-token",
        }),
      ),
    });

    await expect(networkFailure.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(consoleInfo).toHaveBeenCalledWith("ALIYUN_ASR_REQUEST_SETTLED", {
      correlationId: input.correlationId,
      endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
      settled: true,
      abortSignalAborted: false,
      errorName: "TypeError",
      safeSummary: "network_error",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_FAILED",
      expect.objectContaining({
        correlationId: input.correlationId,
        errorName: "TypeError",
        errorSummary: "network_error",
        abortSignalAborted: false,
      }),
    );
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("secret-token");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });
});
