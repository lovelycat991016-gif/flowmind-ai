import { z } from "zod";

import {
  recordingUploadStatuses,
  type RecordingUploadStatus,
} from "@/entities/recording/model/recording";

export const MAX_RECORDING_FILE_SIZE_BYTES = 524_288_000;

export const recordingMimeTypes = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
] as const;

const recordingStatusSchema = z.enum(recordingUploadStatuses);

export const recordingUploadMetadataSchema = z.object({
  meetingId: z.uuid(),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(recordingMimeTypes),
  fileSizeBytes: z.number().int().gt(0).lte(MAX_RECORDING_FILE_SIZE_BYTES),
});

const allowedTransitions: Readonly<
  Record<RecordingUploadStatus, ReadonlyArray<RecordingUploadStatus>>
> = {
  pending: ["uploading", "failed", "cancelled"],
  uploading: ["uploaded", "failed", "cancelled"],
  uploaded: [],
  failed: [],
  cancelled: [],
};

export function canTransitionRecordingUploadStatus(
  from: RecordingUploadStatus,
  to: RecordingUploadStatus,
) {
  return allowedTransitions[from].includes(to);
}

export const recordingLifecycleTransitionSchema = z
  .object({
    from: recordingStatusSchema,
    to: recordingStatusSchema,
  })
  .refine(({ from, to }) => canTransitionRecordingUploadStatus(from, to), {
    message: "Invalid recording upload transition.",
    path: ["to"],
  });
