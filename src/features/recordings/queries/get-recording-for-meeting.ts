import type {
  Recording,
  RecordingUploadStatus,
} from "@/entities/recording/model/recording";
import { createClient } from "@/shared/lib/supabase/server";

const RECORDING_COLUMNS =
  "id,meeting_id,user_id,storage_bucket,storage_path,original_filename,mime_type,file_size_bytes,status,uploaded_at,created_at,updated_at,meetings!inner(id)";

type RecordingRow = {
  id: string;
  meeting_id: string;
  user_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: RecordingUploadStatus;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRecordingRow(row: RecordingRow): Recording {
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

export async function getRecordingForMeeting(
  meetingId: string,
): Promise<Recording | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recordings")
    .select(RECORDING_COLUMNS)
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (error) throw new Error("Unable to load recording.");
  return data ? mapRecordingRow(data as RecordingRow) : null;
}
