import { describe, expect, it, vi } from "vitest";
import { executeNextMeetingKnowledgeJob } from "./execute-meeting-knowledge-job";
const job = { id: "j", meetingId: "m", userId: "u", transcriptId: "t", lockedBy: "w" };
describe("executeNextMeetingKnowledgeJob", () => {
  it("claims, chunks, saves, and completes an owner-scoped transcript", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockResolvedValue({ content: "a".repeat(1400), segments: [] }), saveChunks: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies })).resolves.toMatchObject({ status: "completed" });
    expect(dependencies.saveChunks).toHaveBeenCalledWith(job, expect.arrayContaining([expect.objectContaining({ chunkIndex: 0 })]));
    expect(dependencies.complete).toHaveBeenCalledWith(job);
  });

  it("persists only a safe failure code when transcript loading fails", async () => {
    const dependencies = { claim: vi.fn().mockResolvedValue(job), loadTranscript: vi.fn().mockRejectedValue(new Error("private transcript content")), saveChunks: vi.fn(), complete: vi.fn(), fail: vi.fn() };
    await expect(executeNextMeetingKnowledgeJob({ workerId: "w", leaseSeconds: 60, dependencies })).resolves.toMatchObject({ status: "failed" });
    expect(dependencies.fail).toHaveBeenCalledWith(job, "knowledge_chunking_failed");
    expect(dependencies.fail.mock.calls[0]).not.toContain("private transcript content");
  });
});
