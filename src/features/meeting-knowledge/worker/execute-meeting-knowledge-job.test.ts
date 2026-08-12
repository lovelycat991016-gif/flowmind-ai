import { afterEach, describe, expect, it, vi } from "vitest";
import { executeNextMeetingKnowledgeJob } from "./execute-meeting-knowledge-job";
const tokenOne = "knowledge-cron:550e8400-e29b-41d4-a716-446655440000";
const tokenTwo = "knowledge-cron:660e8400-e29b-41d4-a716-446655440000";
const job = { id: "j", meetingId: "m", userId: "u", transcriptId: "t", lockedBy: tokenOne };
const mocks = vi.hoisted(() => ({ createInvocationToken: vi.fn() }));
vi.mock("@/features/transcription/worker/create-invocation-token", () => ({ createInvocationToken: mocks.createInvocationToken }));
afterEach(() => vi.useRealTimers());
describe("executeNextMeetingKnowledgeJob", () => {
  it("claims, chunks, saves, and completes an owner-scoped transcript", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "a".repeat(1400), segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    mocks.createInvocationToken.mockReturnValue(tokenOne);
    await expect(executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider: { metadata: { provider: "mock", model: null }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0)) } })).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.claim).toHaveBeenCalledWith(tokenOne, 60);
    expect(dependencies.saveChunks).toHaveBeenCalledWith(job, expect.arrayContaining([expect.objectContaining({ chunkIndex: 0 })]));
    expect(dependencies.complete).toHaveBeenCalledWith(job);
  });

  it("uses a distinct invocation token for every execution", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValueOnce({ ...job, lockedBy: tokenOne }).mockResolvedValueOnce({ ...job, lockedBy: tokenTwo }), loadTranscript: vi.fn().mockResolvedValue({ content: "text", segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    mocks.createInvocationToken.mockReturnValueOnce(tokenOne).mockReturnValueOnce(tokenTwo);
    const embeddingProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0)) };
    await executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider });
    await executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider });
    expect(dependencies.claim).toHaveBeenNthCalledWith(1, tokenOne, 60);
    expect(dependencies.claim).toHaveBeenNthCalledWith(2, tokenTwo, 60);
  });

  it("does not start embeddings after the terminal reserve is exhausted", async () => {
    mocks.createInvocationToken.mockReturnValue(tokenOne);
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "text", segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    const embeddingProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn() };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider, now: vi.fn().mockReturnValueOnce(0).mockReturnValue(195_000) })).resolves.toMatchObject({ status: "failed" });
    expect(embeddingProvider.embed).not.toHaveBeenCalled();
  });

  it("limits embedding concurrency and passes an abort signal", async () => {
    mocks.createInvocationToken.mockReturnValue(tokenOne);
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "a".repeat(7_000), segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    let active = 0;
    let peak = 0;
    const embeddingProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn(async (_text: string, { signal }: { signal?: AbortSignal }) => { expect(signal).toBeInstanceOf(AbortSignal); active += 1; peak = Math.max(peak, active); await Promise.resolve(); active -= 1; return Array(1536).fill(0); }) };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider })).resolves.toMatchObject({ status: "completed" });
    expect(peak).toBeLessThanOrEqual(3);
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
    const retryJob = { ...job, lockedBy: tokenTwo };
    const dependencies = { claim: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(retryJob), loadTranscript: vi.fn().mockResolvedValue({ content: "text", segments: [] }), saveChunks: vi.fn(), saveEmbeddings: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    mocks.createInvocationToken.mockReturnValueOnce(tokenOne).mockReturnValueOnce(tokenTwo);
    const failedProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn().mockRejectedValue(new Error("provider secret")) };
    const successProvider = { metadata: { provider: "mock" as const, model: null }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0)) };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider: failedProvider })).resolves.toMatchObject({ status: "failed" });
    await expect(executeNextMeetingKnowledgeJob({ workerId: "knowledge-cron", leaseSeconds: 60, dependencies, embeddingProvider: successProvider })).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.saveChunks).toHaveBeenCalledTimes(2);
    expect(dependencies.saveEmbeddings).toHaveBeenCalledTimes(1);
    expect(dependencies.complete).toHaveBeenCalledWith(retryJob);
  });
});
