import { createEmbeddingProvider } from "@/features/embedding-providers/factory/create-embedding-provider";
import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";

import type { ReindexChunk } from "../model/reindex-contract";

export function createSupabaseReindexDependencies() {
  return {
    environment: process.env.VERCEL_ENV,
    allowedOwners: process.env.EMBEDDING_REINDEX_ALLOWED_OWNERS,
    embeddingProvider: createEmbeddingProvider(),
    async loadPage(input: { ownerId: string; batchSize: number; cursor?: { transcriptId: string; chunkIndex: number } }): Promise<ReindexChunk[]> {
      const client = createWorkerServiceRoleClient();
      let query = client.from("meeting_document_chunks").select("id,user_id,transcript_id,chunk_index,content").eq("user_id", input.ownerId).order("transcript_id", { ascending: true }).order("chunk_index", { ascending: true }).limit(input.batchSize);
      if (input.cursor) query = query.or(`transcript_id.gt.${input.cursor.transcriptId},and(transcript_id.eq.${input.cursor.transcriptId},chunk_index.gt.${input.cursor.chunkIndex})`);
      const { data, error } = await query;
      if (error) throw new Error("Unable to load embedding reindex page.");
      return ((data ?? []) as { id: string; user_id: string; transcript_id: string; chunk_index: number; content: string }[]).map((row) => ({ id: row.id, ownerId: row.user_id, transcriptId: row.transcript_id, chunkIndex: row.chunk_index, content: row.content }));
    },
    async updateEmbedding(input: { chunkId: string; ownerId: string; chunkIndex: number; embedding: number[] }) {
      const { data, error } = await createWorkerServiceRoleClient().from("meeting_document_chunks").update({ embedding: `[${input.embedding.join(",")}]` }).eq("id", input.chunkId).eq("user_id", input.ownerId).eq("chunk_index", input.chunkIndex).select("id").maybeSingle();
      if (error || !data) throw new Error("Unable to update embedding reindex chunk.");
    },
  };
}
