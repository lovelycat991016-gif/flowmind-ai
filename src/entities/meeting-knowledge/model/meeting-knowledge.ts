export const meetingKnowledgeJobStatuses = [
  "queued",
  "processing",
  "completed",
  "failed",
] as const;

export type MeetingKnowledgeJobStatus =
  (typeof meetingKnowledgeJobStatuses)[number];

export type MeetingKnowledgeJob = {
  id: string;
  meetingId: string;
  userId: string;
  transcriptId: string;
  status: MeetingKnowledgeJobStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeetingDocumentChunk = {
  id: string;
  meetingId: string;
  userId: string;
  transcriptId: string;
  content: string;
  chunkIndex: number;
  metadata: { speaker?: string; timestamp?: number; source_hash?: string };
  createdAt: string;
};

export function isActiveMeetingKnowledgeJobStatus(
  status: MeetingKnowledgeJobStatus,
) {
  return status === "queued" || status === "processing";
}
