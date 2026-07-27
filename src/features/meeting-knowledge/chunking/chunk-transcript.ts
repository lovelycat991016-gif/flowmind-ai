import { createHash } from "node:crypto";

const CHUNK_SIZE = 1200;
const OVERLAP = 200;

type Segment = { content: string; startMs: number; speaker?: string | null };
export function chunkTranscript(content: string, segments: Segment[]) {
  const normalized = content.trim();
  if (!normalized) return [];
  const chunks = [];
  for (let start = 0, index = 0; start < normalized.length; index += 1) {
    const value = normalized.slice(start, start + CHUNK_SIZE);
    chunks.push({
      chunkIndex: index,
      content: value,
      metadata: {
        speaker: segments.find((segment) => value.includes(segment.content))?.speaker ?? null,
        timestamp: segments.find((segment) => value.includes(segment.content))?.startMs ?? null,
        source_hash: createHash("sha256").update(value).digest("hex"),
      },
    });
    if (start + CHUNK_SIZE >= normalized.length) break;
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}
