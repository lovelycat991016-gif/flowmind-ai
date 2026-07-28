import { createClient } from "@/shared/lib/supabase/server";
import type { RetrievedMeetingChunk } from "./retrieve-meeting-context";
export async function searchMeetingChunks(input: { embedding: number[]; meetingId?: string; matchCount: number }): Promise<RetrievedMeetingChunk[]> {
  if (input.embedding.length !== 1536 || input.matchCount < 1 || input.matchCount > 20) return [];
  const { data, error } = await (await createClient()).rpc("match_meeting_document_chunks", { p_query_embedding: `[${input.embedding.join(",")}]`, p_match_count: input.matchCount, p_meeting_id: input.meetingId ?? null });
  if (error) return [];
  return ((data ?? []) as Array<{ content: string; metadata: Record<string, unknown>; meeting_id: string; similarity: number }>).map((row) => ({ content: row.content, metadata: row.metadata, meetingId: row.meeting_id, similarity: row.similarity }));
}
