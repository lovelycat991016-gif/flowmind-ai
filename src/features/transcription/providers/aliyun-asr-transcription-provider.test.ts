import { afterEach, describe, expect, it, vi } from "vitest";

import { AliyunAsrTranscriptionProvider } from "./aliyun-asr-transcription-provider";
import { AliyunNlsTokenError } from "./aliyun-nls-token-client";

const input = {
  filename: "weekly-sync.webm",
  mimeType: "audio/webm",
  bytes: new Uint8Array([97, 117, 100, 105, 111]),
  language: "zh",
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
    const transport = vi.fn().mockResolvedValue(
      response({
        result: "Project status is on track.",
        sentences: [
          { begin_time: 0, end_time: 1200, text: "Project status is on track." },
        ],
      }),
    );
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport,
    });

    await expect(provider.transcribe(input)).resolves.toEqual({
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
    expect(transport.mock.calls[0]?.[0].headers["X-NLS-Token"]).toBe(
      "temporary-token",
    );
  });

  it("maps caller cancellation to the existing provider timeout code", async () => {
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
  });

  it.each([
    [401, "provider_request_failed"],
    [403, "provider_request_failed"],
    [413, "provider_rejected_audio"],
    [415, "provider_rejected_audio"],
    [429, "provider_rate_limited"],
    [503, "provider_unavailable"],
  ])("maps ASR HTTP %i to the safe %s code", async (status, code) => {
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(response({}, status)),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({ code });
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
      transport: vi.fn().mockResolvedValue(response({ result: "", sentences: [] })),
    });

    await expect(tokenFailure.transcribe(input)).rejects.toMatchObject({
      code: "provider_unavailable",
    });
    await expect(malformedResponse.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
  });

  it("logs safe request metadata and completion without exposing the token", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({
          result: "Safe transcript",
          sentences: [{ begin_time: 0, end_time: 1, text: "Safe transcript" }],
        }),
      ),
    });

    await provider.transcribe(input);

    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_STARTED",
      expect.objectContaining({
        operation: "FlashRecognizer",
        endpointHost: "nls-gateway-cn-shanghai.aliyuncs.com",
        mimeType: input.mimeType,
        audioBytes: input.bytes.length,
        fileExtension: "webm",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_TRANSCRIPTION_COMPLETED",
      expect.objectContaining({ status: 200, transcriptLength: 15 }),
    );
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("temporary-token");
  });

  it("logs an ASR HTTP failure without exposing provider response content", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        response({ Code: "InvalidToken", Message: "token=secret-token" }, 401),
      ),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_HTTP_FAILED",
      expect.objectContaining({
        status: 401,
        errorCode: "InvalidToken",
        errorSummary: "http_401",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
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
      transport: vi.fn().mockResolvedValue(response({ sentences: [] })),
    });

    await expect(invalidJson.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    await expect(missingResult.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_RESPONSE_PARSE_FAILED",
      expect.objectContaining({ errorSummary: "invalid_json" }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_INVALID_RESULT",
      expect.objectContaining({ errorSummary: "missing_valid_transcript" }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });

  it("logs a safe network failure and maps aborts to the existing timeout code", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const networkFailure = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockRejectedValue(new TypeError("network secret-token")),
    });
    const controller = new AbortController();
    controller.abort();
    const aborted = new AliyunAsrTranscriptionProvider({
      appKey: "app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockRejectedValue(new DOMException("", "AbortError")),
    });

    await expect(networkFailure.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    await expect(aborted.transcribe({ ...input, signal: controller.signal })).rejects.toMatchObject({
      code: "provider_timeout",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_FAILED",
      expect.objectContaining({ errorSummary: "network_error", abortSignalAborted: false }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "ALIYUN_ASR_REQUEST_FAILED",
      expect.objectContaining({ errorSummary: "abort", abortSignalAborted: true }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });
});
