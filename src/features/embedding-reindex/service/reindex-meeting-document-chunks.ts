import { validateEmbedding, type EmbeddingProvider } from "@/features/embedding-providers/model/embedding-provider";

import type { ReindexChunk, ReindexInput, ReindexResult } from "../model/reindex-contract";
import { decodeReindexCursor, encodeReindexCursor, validateReindexAccess, validateReindexInput } from "../validation/validate-reindex-input";

const CONCURRENCY = 3;

type Dependencies = {
  environment: string | undefined;
  allowedOwners: string | undefined;
  embeddingProvider: EmbeddingProvider;
  loadPage(input: { ownerId: string; batchSize: number; cursor?: { transcriptId: string; chunkIndex: number } }): Promise<ReindexChunk[]>;
  updateEmbedding(input: { chunkId: string; ownerId: string; chunkIndex: number; embedding: number[] }): Promise<void>;
};

function safeCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return "embedding_reindex_failed";
}

export async function reindexMeetingDocumentChunks(input: ReindexInput, dependencies: Dependencies): Promise<ReindexResult> {
  const validated = validateReindexInput(input);
  validateReindexAccess({ environment: dependencies.environment, allowedOwners: dependencies.allowedOwners, ownerId: validated.ownerId });
  const cursor = decodeReindexCursor(validated.cursor);
  const chunks = await dependencies.loadPage({ ownerId: validated.ownerId, batchSize: validated.batchSize, cursor });
  const failures: ReindexResult["failures"] = [];
  let next = 0;
  let succeeded = 0;
  async function run() {
    while (true) {
      const chunk = chunks[next++];
      if (!chunk) return;
      try {
        if (chunk.ownerId !== validated.ownerId) throw Object.assign(new Error(), { code: "owner_mismatch" });
        const embedding = validateEmbedding(await dependencies.embeddingProvider.embed(chunk.content));
        await dependencies.updateEmbedding({ chunkId: chunk.id, ownerId: validated.ownerId, chunkIndex: chunk.chunkIndex, embedding });
        succeeded += 1;
      } catch (error) {
        failures.push({ chunkId: chunk.id, errorCode: safeCode(error) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, run));
  const last = chunks.at(-1);
  return { processed: chunks.length, succeeded, failed: failures.length, ...(last ? { nextCursor: encodeReindexCursor(last) } : {}), failures };
}
