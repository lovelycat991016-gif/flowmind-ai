import { describe, expect, it, vi } from "vitest";

import { OpenAIWhisperTranscriptionProvider } from "./openai-whisper-provider";

const input = {
  filename: "weekly-sync.webm",
  mimeType: "audio/webm",
  bytes: new Uint8Array([97, 117, 100, 105, 111]),
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("OpenAIWhisperTranscriptionProvider", () => {
  it("maps the verbose Whisper response into the provider-neutral transcription result", async () => {
    const transport = vi.fn().mockResolvedValue(
      response({
        text: "本周项目进展顺利。",
        language: "zh",
        segments: [
          { start: 0, end: 1.2, text: "本周项目进展顺利。" },
          { start: 1.2, end: 2, text: "下周继续推进。" },
        ],
      }),
    );
    const provider = new OpenAIWhisperTranscriptionProvider({
      apiKey: "test-key",
      transport,
    });

    await expect(provider.transcribe(input)).resolves.toEqual({
      provider: "openai",
      providerModel: "whisper-1",
      language: "zh",
      content: "本周项目进展顺利。",
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          content: "本周项目进展顺利。",
        },
        {
          segmentIndex: 1,
          startMs: 1200,
          endMs: 2000,
          content: "下周继续推进。",
        },
      ],
    });
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0]?.[0].headers.Authorization).toBe(
      "Bearer test-key",
    );
  });

  it("returns a safe error when the provider response cannot satisfy the transcript contract", async () => {
    const provider = new OpenAIWhisperTranscriptionProvider({
      apiKey: "test-key",
      transport: vi
        .fn()
        .mockResolvedValue(response({ text: "", segments: [] })),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
  });

  it.each([
    [429, "provider_rate_limited"],
    [503, "provider_unavailable"],
    [408, "provider_timeout"],
    [400, "provider_rejected_audio"],
  ])("maps HTTP %i to the safe %s code", async (status, code) => {
    const provider = new OpenAIWhisperTranscriptionProvider({
      apiKey: "test-key",
      transport: vi
        .fn()
        .mockResolvedValue(response({ error: "detail" }, status)),
    });

    await expect(provider.transcribe(input)).rejects.toMatchObject({ code });
  });
});
