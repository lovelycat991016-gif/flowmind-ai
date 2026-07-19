import type {
  Transcript,
  TranscriptSegment,
} from "@/entities/transcript/model/transcript";
import { createClient } from "@/shared/lib/supabase/server";

const TRANSCRIPT_COLUMNS =
  "id,recording_id,user_id,provider,provider_model,language,content,completed_at,created_at,updated_at,transcript_segments(segment_index,start_ms,end_ms,content)";

type TranscriptRow = {
  id: string;
  recording_id: string;
  user_id: string;
  provider: string;
  provider_model: string;
  language: string | null;
  content: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
  transcript_segments: Array<{
    segment_index: number;
    start_ms: number;
    end_ms: number;
    content: string;
  }>;
};

export type TranscriptWithSegments = Transcript & {
  segments: TranscriptSegment[];
};

function mapTranscriptRow(row: TranscriptRow): TranscriptWithSegments {
  return {
    id: row.id,
    recordingId: row.recording_id,
    userId: row.user_id,
    provider: row.provider,
    providerModel: row.provider_model,
    language: row.language,
    content: row.content,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    segments: row.transcript_segments
      .map((segment) => ({
        segmentIndex: segment.segment_index,
        startMs: segment.start_ms,
        endMs: segment.end_ms,
        content: segment.content,
      }))
      .sort((left, right) => left.segmentIndex - right.segmentIndex),
  };
}

export async function getTranscriptForRecording(
  recordingId: string,
): Promise<TranscriptWithSegments | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transcripts")
    .select(TRANSCRIPT_COLUMNS)
    .eq("recording_id", recordingId)
    .maybeSingle();

  if (error) throw new Error("Unable to load transcript.");
  return data ? mapTranscriptRow(data as TranscriptRow) : null;
}
