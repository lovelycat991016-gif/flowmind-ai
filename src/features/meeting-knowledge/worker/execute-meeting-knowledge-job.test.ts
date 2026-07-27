import { describe, expect, it, vi } from "vitest";
import { executeNextMeetingKnowledgeJob } from "./execute-meeting-knowledge-job";
const job = { id: "j", meetingId: "m", userId: "u", transcriptId: "t", lockedBy: "w" };
describe("executeNextMeetingKnowledgeJob", () => {
  it("claims, chunks, saves, and completes an owner-scoped transcript", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "a".repeat(1400), segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies, embeddingProvider: { metadata: { provider: "mock", model: null }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0)) } })).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.saveChunks).toHaveBeenCalledWith(job, expect.arrayContaining([expect.objectContaining({ chunkIndex: 0 })]));
    expect(dependencies.complete).toHaveBeenCalledWith(job);
  });

  it("persists only a safe failure code when transcript loading fails", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockRejectedValue(new Error("private transcript content")), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies, embeddingProvider: { metadata: { provider: "mock", model: null }, embed: vi.fn() } })).resolves.toMatchObject({ status: "failed" });
    expect(dependencies.fail).toHaveBeenCalledWith(job, "knowledge_chunking_failed");
    expect(dependencies.fail.mock.calls[0]).not.toContain("private transcript content");
  });

  it("fails safely when the embedding provider rejects or returns an invalid dimension", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "text", segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    await executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies, embeddingProvider: { metadata: { provider: "mock", model: null }, embed: vi.fn().mockResolvedValue(Array(512).fill(0)) } });
    expect(dependencies.fail).toHaveBeenCalledWith(job, "knowledge_chunking_failed");
    expect(dependencies.saveEmbeddings).not.toHaveBeenCalled();
  });

  it("retries a failed embedding job without creating duplicate chunks", async () => {
    const retryJob = { ...job, lockedBy: "w2" };
    const dependencies = { claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(retryJob), loadTranscript: vi.fn().mockResolvedValue({ content: "text", segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    const failedProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn().mockRejectedValue(new Error("provider secret")) };
    const successProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0)) };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies, embeddingProvider: failedProvider })).resolves.toMatchObject({ status: "failed" });
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w2", leaseSeconds: 60, dependencies, embeddingProvider: successProvider })).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.saveChunks).toHaveBeenCalledTimes(2);
    expect(dependencies.saveEmbeddings).toHaveBeenCalledTimes(1);
    expect(dependencies.complete).toHaveBeenCalledWith(retryJob);
  });
});
