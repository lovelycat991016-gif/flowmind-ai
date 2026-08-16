import { describe, expect, it, vi } from "vitest";

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
});
