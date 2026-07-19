export const recordingUploadStatuses = [
  "pending",
  "uploading",
  "uploaded",
  "failed",
  "cancelled",
] as const;

export type RecordingUploadStatus = (typeof recordingUploadStatuses)[number];

export type Recording = {
  id: string;
  meetingId: string;
  userId: string;
  storageBucket: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: RecordingUploadStatus;
  uploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isActiveRecordingUploadStatus(status: RecordingUploadStatus) {
  return (
    status === "pending" || status === "uploading" || status === "uploaded"
  );
}

export function formatRecordingFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
