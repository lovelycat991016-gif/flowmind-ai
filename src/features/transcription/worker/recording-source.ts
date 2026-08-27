import type { Recording } from "@/entities/recording/model/recording";
import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";
import { recordingMimeTypes } from "@/features/recordings/schemas/recording-input";
import type { ClaimedProcessingJob } from "@/features/transcription/worker/claim-processing-job";
import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";

const RECORDING_COLUMNS =
  "id,meeting_id,user_id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,status,uploaded_at,created_at,updated_at,meetings!inner(user_id)";

type RecordingSourceRow = {
  id: string;
  meeting_id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: Recording["status"];
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
  meetings: { user_id: string } | { user_id: string }[];
};

export type RecordingAudio = {
  recording: Recording;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
};

export class RecordingSourceError extends Error {
  constructor(readonly code: TranscriptionFailureCode) {
    super("Unable to load recording audio.");
    this.name = "RecordingSourceError";
  }
}

function mapRecording(row: RecordingSourceRow): Recording {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    status: row.status,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasMatchingMeetingOwner(row: RecordingSourceRow, userId: string) {
  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  return row.user_id === userId && meeting?.user_id === userId;
}

function isRecordingMimeType(
  value: string,
): value is (typeof recordingMimeTypes)[number] {
  return recordingMimeTypes.some((mimeType) => mimeType === value);
}

export async function getRecordingAudioForClaimedJob(input: {
  job: ClaimedProcessingJob;
  maxInputBytes: number;
}): Promise<RecordingAudio> {
  if (!Number.isSafeInteger(input.maxInputBytes) || input.maxInputBytes <= 0) {
    throw new RecordingSourceError("invalid_audio");
  }

  const supabase = createWorkerServiceRoleClient();
  const { data, error } = await supabase
    .from("recordings")
    .select(RECORDING_COLUMNS)
    .eq("id", input.job.recordingId)
    .eq("user_id", input.job.userId)
    .maybeSingle();

  if (error) throw new RecordingSourceError("storage_unavailable");
  if (!data) throw new RecordingSourceError("storage_object_missing");

  const row = data as RecordingSourceRow;
  if (
    !hasMatchingMeetingOwner(row, input.job.userId) ||
    row.status !== "uploaded"
  ) {
    throw new RecordingSourceError("invalid_audio");
  }
  if (!isRecordingMimeType(row.mime_type)) {
    throw new RecordingSourceError("audio_format_unsupported");
  }
  if (row.file_size_bytes > input.maxInputBytes) {
    throw new RecordingSourceError("transcription_input_too_large");
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(row.storage_bucket)
    .download(row.storage_path);
  if (downloadError || !blob)
    throw new RecordingSourceError("storage_object_missing");
  if (blob.size > input.maxInputBytes) {
    throw new RecordingSourceError("transcription_input_too_large");
  }

  return {
    recording: mapRecording(row),
    filename: row.original_filename,
    mimeType: row.mime_type,
    bytes: new Uint8Array(await blob.arrayBuffer()),
  };
}
