export const meetingIntelligenceGenerationStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;
export type MeetingIntelligenceGenerationStatus =
  (typeof meetingIntelligenceGenerationStatuses)[number];
export const meetingIntelligenceFailureCodes = [
  "intelligence_input_invalid",
  "intelligence_input_too_large",
  "provider_rejected_input",
  "provider_rate_limited",
  "provider_unavailable",
  "provider_timeout",
  "provider_request_failed",
  "intelligence_output_invalid",
  "lease_expired",
  "worker_unexpected_error",
] as const;
export type MeetingIntelligenceFailureCode =
  (typeof meetingIntelligenceFailureCodes)[number];
export type MeetingSummary = { content: string };
export type MeetingActionItem = {
  content: string;
  assigneeName: string | null;
  dueDate: string | null;
  sourceSegmentIndex: number | null;
};
export type MeetingDecision = {
  content: string;
  sourceSegmentIndex: number | null;
};
export type MeetingIntelligenceResult = {
  provider: string;
  modelIdentifier: string;
  promptVersion: string;
  summary: MeetingSummary;
  actionItems: MeetingActionItem[];
  decisions: MeetingDecision[];
  outputMetadata: Record<string, string | number | boolean | null>;
};
export type MeetingIntelligence = {
  id: string;
  meetingId: string;
  transcriptId: string;
  userId: string;
  status: MeetingIntelligenceGenerationStatus;
  modelIdentifier: string | null;
  promptVersion: string;
  outputMetadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
};
const retryable = new Set<MeetingIntelligenceFailureCode>([
  "provider_rate_limited",
  "provider_unavailable",
  "provider_timeout",
  "provider_request_failed",
  "lease_expired",
  "worker_unexpected_error",
]);
export function isRetryableMeetingIntelligenceFailureCode(
  code: MeetingIntelligenceFailureCode,
) {
  return retryable.has(code);
}
