import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";
import type { MeetingKnowledgeDependencies } from "./execute-meeting-knowledge-job";

export function createMeetingKnowledgeRepository(): MeetingKnowledgeDependencies {
  return {
    async claim(workerId, leaseSeconds) {
      const { data, error } = await createWorkerServiceRoleClient().rpc(
        "claim_next_meeting_knowledge_job",
        { p_worker_id: workerId, p_lease_seconds: leaseSeconds },
      );
      if (error) throw new Error("Unable to claim meeting knowledge job.");
      if (!data) return null;
      const row = data as { id: string; meeting_id: string; user_id: string; transcript_id: string; locked_by: string };
      return { id: row.id, meetingId: row.meeting_id, userId: row.user_id, transcriptId: row.transcript_id, lockedBy: row.locked_by };
    },
    async loadTranscript(job) {
      const client = createWorkerServiceRoleClient();
      const { data, error } = await client.from("transcripts").select("content,transcript_segments(content,start_ms)").eq("id", job.transcriptId).eq("user_id", job.userId).maybeSingle();
      if (error || !data) throw new Error("knowledge_transcript_unavailable");
      const row = data as { content: string; transcript_segments: { content: string; start_ms: number }[] };
      return { content: row.content, segments: row.transcript_segments.map((segment) => ({ content: segment.content, startMs: segment.start_ms })) };
    },
    async saveChunks(job, chunks) {
      const client = createWorkerServiceRoleClient();
      const { error } = await client.from("meeting_document_chunks").upsert(chunks.map((chunk) => ({ meeting_id: job.meetingId, user_id: job.userId, transcript_id: job.transcriptId, content: chunk.content, chunk_index: chunk.chunkIndex, metadata: chunk.metadata })), { onConflict: "transcript_id,chunk_index" });
      if (error) throw new Error("knowledge_chunk_persistence_failed");
    },
    async saveEmbeddings(job, embeddings) {
      const client = createWorkerServiceRoleClient();
      for (const [chunkIndex, embedding] of embeddings.entries()) {
        const { error } = await client.from("meeting_document_chunks").update({ embedding: `[${embedding.join(",")}]` }).eq("transcript_id", job.transcriptId).eq("user_id", job.userId).eq("chunk_index", chunkIndex);
        if (error) throw new Error("knowledge_embedding_persistence_failed");
      }
    },
    async complete(job) {
      const { error } = await createWorkerServiceRoleClient().from("meeting_knowledge_jobs").update({ status: "completed", locked_by: null, lease_expires_at: null, last_error_code: null }).eq("id", job.id).eq("user_id", job.userId).eq("status", "processing").eq("locked_by", job.lockedBy);
      if (error) throw new Error("Unable to complete meeting knowledge job.");
    },
    async fail(job, code) {
      const { error } = await createWorkerServiceRoleClient().from("meeting_knowledge_jobs").update({ status: "failed", locked_by: null, lease_expires_at: null, last_error_code: code }).eq("id", job.id).eq("user_id", job.userId).eq("status", "processing").eq("locked_by", job.lockedBy);
      if (error) throw new Error("Unable to fail meeting knowledge job.");
    },
  };
}
