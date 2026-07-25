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
vi.mock(
  "@/features/meeting-intelligence/providers/openai-meeting-intelligence-provider",
  () => ({ OpenAIMeetingIntelligenceProvider: mocks.Provider }),
);
vi.mock(
  "@/features/meeting-intelligence/worker/execute-meeting-intelligence",
  () => ({
    executeNextMeetingIntelligenceWithServiceRole: mocks.execute,
  }),
);

import { GET } from "./route";

describe("meeting intelligence cron route", () => {
  it("rejects requests without the worker secret", async () => {
    mocks.authorize.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-intelligence"),
    );

    expect(response.status).toBe(401);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("creates the OpenAI provider only on the authenticated server worker", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.getOpenAIEnv.mockReturnValue({
      apiKey: "server-key",
      model: "gpt-4.1-mini",
    });
    mocks.Provider.mockImplementation(() => ({ provider: true }));
    mocks.execute.mockResolvedValue({ status: "completed", jobId: "job" });

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-intelligence", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.Provider).toHaveBeenCalledWith({
      apiKey: "server-key",
      model: "gpt-4.1-mini",
    });
    expect(mocks.execute).toHaveBeenCalledWith(
      expect.objectContaining({ provider: { provider: true } }),
    );
  });
});
