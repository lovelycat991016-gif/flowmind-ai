import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  createProvider: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/features/transcription/worker/worker-auth", () => ({
  authorizeConfiguredWorkerRequest: mocks.authorize,
}));
vi.mock("@/features/transcription/factory/create-transcription-provider", () => ({
  createTranscriptionProvider: mocks.createProvider,
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

  it("runs the configured transcription provider only after authorization", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.createProvider.mockReturnValue({ provider: true });
    mocks.execute.mockResolvedValue({ status: "completed", jobId: "job" });

    const response = await GET(
      new Request("http://localhost/api/cron/transcription", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createProvider).toHaveBeenCalledOnce();
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.objectContaining({ provider: { provider: true } }),
    );
  });

  it("logs a safe cron diagnostic while preserving the generic 500 response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.authorize.mockReturnValue(true);
    mocks.createProvider.mockReturnValue({ provider: true });
    mocks.execute.mockRejectedValue(
      new Error("provider request failed with Bearer secret-token"),
    );

    const response = await GET(
      new Request("http://localhost/api/cron/transcription", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to process transcription.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "TRANSCRIPTION_CRON_FAILED",
      expect.objectContaining({
        error: expect.objectContaining({ name: "Error" }),
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
  });
});
