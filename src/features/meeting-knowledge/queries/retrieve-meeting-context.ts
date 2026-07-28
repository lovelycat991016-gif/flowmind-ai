import { createEmbeddingProvider } from "@/features/embedding-providers/factory/create-embedding-provider";
import { searchMeetingChunks } from "./vector-search-repository";

export type RetrievedMeetingChunk = { content: string; metadata: Record<string, unknown>; meetingId: string; similarity: number };

export async function retrieveMeetingContext(input: { question: string; meetingId?: string; matchCount?: number }): Promise<RetrievedMeetingChunk[]> {
  try {
    const embedding = await createEmbeddingProvider().embed(input.question);
    return await searchMeetingChunks({
      embedding,
      meetingId: input.meetingId,
      matchCount: input.matchCount ?? 6,
    });
  } catch { return []; }
}
