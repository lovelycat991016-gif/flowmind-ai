import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  createEmbeddingProvider: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/features/transcription/worker/worker-auth", () => ({
  authorizeConfiguredWorkerRequest: mocks.authorize,
}));
vi.mock(
  "@/features/embedding-providers/factory/create-embedding-provider",
  () => ({
    createEmbeddingProvider: mocks.createEmbeddingProvider,
  }),
);
vi.mock(
  "@/features/meeting-knowledge/worker/execute-meeting-knowledge-job",
  () => ({
    executeNextMeetingKnowledgeJobWithServiceRole: mocks.execute,
  }),
);

import { GET } from "./route";

describe("meeting knowledge cron route", () => {
  it("rejects an unauthorized request without invoking the worker", async () => {
    mocks.authorize.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-knowledge"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(mocks.createEmbeddingProvider).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("executes an authorized knowledge job with the configured embedding provider", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.createEmbeddingProvider.mockReturnValue({
      metadata: { provider: "mock" },
    });
    mocks.execute.mockResolvedValue({
      status: "completed",
      jobId: "knowledge-job",
    });

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-knowledge", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "completed",
      jobId: "knowledge-job",
    });
    expect(mocks.execute).toHaveBeenCalledWith({
      workerId: "meeting-knowledge-cron",
      leaseSeconds: 300,
      embeddingProvider: { metadata: { provider: "mock" } },
    });
  });

  it("returns an idle status when no knowledge job is queued", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.createEmbeddingProvider.mockReturnValue({
      metadata: { provider: "mock" },
    });
    mocks.execute.mockResolvedValue({ status: "idle" });

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-knowledge", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "idle" });
  });

  it("isolates worker failures behind a safe response", async () => {
    mocks.authorize.mockReturnValue(true);
    mocks.createEmbeddingProvider.mockImplementation(() => {
      throw new Error("embedding key leaked");
    });

    const response = await GET(
      new Request("http://localhost/api/cron/meeting-knowledge", {
        headers: { Authorization: "Bearer cron" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to process meeting knowledge.",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
