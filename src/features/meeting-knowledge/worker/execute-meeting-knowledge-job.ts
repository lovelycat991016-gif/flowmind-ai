import { chunkTranscript } from "@/features/meeting-knowledge/chunking/chunk-transcript";
import { createMeetingKnowledgeRepository } from "./meeting-knowledge-repository";
import { validateEmbedding, type EmbeddingProvider } from "@/features/embedding-providers/model/embedding-provider";

type Job = { id: string; meetingId: string; userId: string; transcriptId: string; lockedBy: string };
type Source = { content: string; segments: { content: string; startMs: number; speaker?: string | null }[] };
export type MeetingKnowledgeDependencies = {
  claim(workerId: string, leaseSeconds: number): Promise<Job | null>;
  loadTranscript(job: Job): Promise<Source>;
  saveChunks(job: Job, chunks: ReturnType<typeof chunkTranscript>): Promise<void>;
  saveEmbeddings(job: Job, embeddings: number[][]): Promise<void>;
  complete(job: Job): Promise<void>;
  fail(job: Job, code: string): Promise<void>;
};

export async function executeNextMeetingKnowledgeJob(input: { workerId: string; leaseSeconds: number; dependencies: MeetingKnowledgeDependencies; embeddingProvider: EmbeddingProvider }) {
  const job = await input.dependencies.claim(input.workerId, input.leaseSeconds);
  if (!job) return { status: "idle" as const };
  if (job.lockedBy !== input.workerId) throw new Error("Unable to execute meeting knowledge job.");
  try {
    const source = await input.dependencies.loadTranscript(job);
    const chunks = chunkTranscript(source.content, source.segments);
    await input.dependencies.saveChunks(job, chunks);
    await input.dependencies.saveEmbeddings(job, await Promise.all(chunks.map(async (chunk) => validateEmbedding(await input.embeddingProvider.embed(chunk.content)))));
    await input.dependencies.complete(job);
    return { status: "completed" as const, jobId: job.id };
  } catch {
    await input.dependencies.fail(job, "knowledge_chunking_failed");
    return { status: "failed" as const, jobId: job.id };
  }
}
export async function executeNextMeetingKnowledgeJobWithServiceRole(input: { workerId: string; leaseSeconds: number; embeddingProvider: EmbeddingProvider }) {
  return executeNextMeetingKnowledgeJob({ ...input, dependencies: createMeetingKnowledgeRepository() });
}
