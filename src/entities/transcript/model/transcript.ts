export const transcriptionFailureCodes = [
  "storage_object_missing",
  "unsupported_audio_type",
  "transcription_input_too_large",
  "invalid_audio",
  "provider_rejected_audio",
  "storage_unavailable",
  "provider_rate_limited",
  "provider_unavailable",
  "provider_timeout",
  "provider_request_failed",
  "lease_expired",
  "worker_unexpected_error",
] as const;

export type TranscriptionFailureCode =
  (typeof transcriptionFailureCodes)[number];

export type Transcript = {
  id: string;
  recordingId: string;
  userId: string;
  provider: string;
  providerModel: string;
  language: string | null;
  content: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptSegment = {
  segmentIndex: number;
  startMs: number;
  endMs: number;
  content: string;
};

export type TranscriptionResult = {
  provider: string;
  providerModel: string;
  language: string | null;
  content: string;
  segments: TranscriptSegment[];
};

const retryableTranscriptionFailureCodes: ReadonlySet<TranscriptionFailureCode> =
  new Set([
    "storage_unavailable",
    "provider_rate_limited",
    "provider_unavailable",
    "provider_timeout",
    "provider_request_failed",
    "lease_expired",
    "worker_unexpected_error",
  ]);

export function isRetryableTranscriptionFailureCode(
  code: TranscriptionFailureCode,
) {
  return retryableTranscriptionFailureCodes.has(code);
}
