export const processingJobStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ProcessingJobStatus = (typeof processingJobStatuses)[number];

export type ProcessingJob = {
  id: string;
  recordingId: string;
  meetingId: string;
  userId: string;
  status: ProcessingJobStatus;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
};

export function isActiveProcessingJobStatus(status: ProcessingJobStatus) {
  return status === "queued" || status === "running";
}
