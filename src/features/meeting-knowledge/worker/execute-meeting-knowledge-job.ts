import { chunkTranscript } from "@/features/meeting-knowledge/chunking/chunk-transcript";
import { createMeetingKnowledgeRepository } from "./meeting-knowledge-repository";
import { validateEmbedding, type EmbeddingProvider } from "@/features/embedding-providers/model/embedding-provider";
import { createInvocationToken } from "@/features/transcription/worker/create-invocation-token";
import { KNOWLEDGE_EXECUTION_BUDGET_MS, KNOWLEDGE_TERMINAL_RESERVE_MS, getKnowledgeEmbeddingTimeout } from "./knowledge-execution-deadline";

const EMBEDDING_CONCURRENCY = 3;
const EMBEDDING_TIMEOUT_CAP_MS = 30_000;

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

async function embedChunks(input: { chunks: ReturnType<typeof chunkTranscript>; embeddingProvider: EmbeddingProvider; now: () => number; startedAtMs: number }) {
  const embeddings = new Array<number[]>(input.chunks.length);
  let nextIndex = 0;
  async function run() {
    while (true) {
      const index = nextIndex++;
      if (index >= input.chunks.length) return;
      const deadline = getKnowledgeEmbeddingTimeout({ nowMs: input.now(), startedAtMs: input.startedAtMs, budgetMs: KNOWLEDGE_EXECUTION_BUDGET_MS, terminalReserveMs: KNOWLEDGE_TERMINAL_RESERVE_MS, providerCapMs: EMBEDDING_TIMEOUT_CAP_MS });
      if (!deadline.allowed) throw new Error("knowledge_execution_budget_exhausted");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deadline.timeoutMs);
      try {
        embeddings[index] = validateEmbedding(await input.embeddingProvider.embed(input.chunks[index].content, { signal: controller.signal }));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(EMBEDDING_CONCURRENCY, input.chunks.length) }, run));
  return embeddings;
}

export async function executeNextMeetingKnowledgeJob(input: { workerId: string; leaseSeconds: number; dependencies: MeetingKnowledgeDependencies; embeddingProvider: EmbeddingProvider; now?: () => number }) {
  const invocationToken = createInvocationToken(input.workerId);
  const now = input.now ?? Date.now;
  const startedAtMs = now();
  const job = await input.dependencies.claim(invocationToken, input.leaseSeconds);
  if (!job) return { status: "idle" as const };
  if (job.lockedBy !== invocationToken) throw new Error("Unable to execute meeting knowledge job.");
  try {
    const source = await input.dependencies.loadTranscript(job);
    const chunks = chunkTranscript(source.content, source.segments);
    await input.dependencies.saveChunks(job, chunks);
    await input.dependencies.saveEmbeddings(job, await embedChunks({ chunks, embeddingProvider: input.embeddingProvider, now, startedAtMs }));
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
