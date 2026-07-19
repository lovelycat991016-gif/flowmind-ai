import type {
  ProcessingJob,
  ProcessingJobStatus,
} from "@/entities/processing-job/model/processing-job";
import { createClient } from "@/shared/lib/supabase/server";

const PROCESSING_JOB_COLUMNS =
  "id,recording_id,user_id,status,attempt_count,created_at,started_at,completed_at,last_error_code,recordings!inner(meeting_id)";

type ProcessingJobRow = {
  id: string;
  recording_id: string;
  user_id: string;
  status: ProcessingJobStatus;
  attempt_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error_code: string | null;
  recordings: { meeting_id: string } | { meeting_id: string }[];
};

function mapProcessingJobRow(row: ProcessingJobRow): ProcessingJob {
  const recording = Array.isArray(row.recordings)
    ? row.recordings[0]
    : row.recordings;
  if (!recording) throw new Error("Unable to load processing job.");

  return {
    id: row.id,
    recordingId: row.recording_id,
    meetingId: recording.meeting_id,
    userId: row.user_id,
    status: row.status,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.last_error_code,
  };
}

export async function getProcessingJobForRecording(
  recordingId: string,
): Promise<ProcessingJob | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processing_jobs")
    .select(PROCESSING_JOB_COLUMNS)
    .eq("recording_id", recordingId)
    .maybeSingle();

  if (error) throw new Error("Unable to load processing job.");
  return data ? mapProcessingJobRow(data as ProcessingJobRow) : null;
}
