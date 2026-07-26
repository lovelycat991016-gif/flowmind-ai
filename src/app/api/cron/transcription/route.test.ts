import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  getOpenAIEnv: vi.fn(),
  execute: vi.fn(),
  Provider: vi.fn(),
}));

vi.mock("@/features/transcription/worker/worker-auth", () => ({
  authorizeConfiguredWorkerRequest: mocks.authorize,
}));
vi.mock("@/shared/config/openai-env", () => ({
  getOpenAIEnv: mocks.getOpenAIEnv,
}));
vi.mock("@/features/transcription/providers/openai-whisper-provider", () => ({
  OpenAIWhisperTranscriptionProvider: mocks.Provider,
}));
vi.mock("@/features/transcription/worker/execute-transcription-job", () => ({
  executeNextTranscriptionJob: mocks.execute,
}));

import { GET } from "./route";

describe("transcription cron route", () => {
  it("rejects requests without the configured worker secret", async () => {
    mocks.authorize.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/cron/transcription"),
    );

    expect(response.status).toBe(401);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("runs the Whisper worker only after authorization", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.getOpenAIEnv.mockReturnValue({
      apiKey: "server-only-key",
      model: "gpt-4.1-mini",
    });
    mocks.Provider.mockImplementation(() => ({ provider: true }));
    mocks.execute.mockResolvedValue({ status: "completed", jobId: "job" });

    const response = await GET(
      new Request("http://localhost/api/cron/transcription", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.Provider).toHaveBeenCalledWith({
      apiKey: "server-only-key",
    });
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.objectContaining({ provider: { provider: true } }),
    );
  });
});
