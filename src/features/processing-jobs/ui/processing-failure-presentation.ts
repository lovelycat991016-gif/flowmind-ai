import { zhCN } from "@/shared/i18n/zh-CN";

export type ProcessingFailurePresentation = {
  title: string;
  description: string;
};

const failurePresentations = zhCN.processingJobs.failures;

const presentationByFailureCode: Readonly<
  Record<string, ProcessingFailurePresentation>
> = {
  audio_format_mismatch: failurePresentations.audioFormatMismatch,
  audio_format_unsupported: failurePresentations.audioFormatUnsupported,
  audio_format_unrecognized: failurePresentations.audioFormatUnrecognized,
  unsupported_audio_type: failurePresentations.audioFormatUnsupported,
  invalid_audio: failurePresentations.audioFormatUnrecognized,
  transcription_input_too_large: failurePresentations.inputTooLarge,
  storage_object_missing: failurePresentations.storage,
  storage_unavailable: failurePresentations.storage,
  provider_rejected_audio: failurePresentations.provider,
  provider_rate_limited: failurePresentations.provider,
  provider_unavailable: failurePresentations.provider,
  provider_timeout: failurePresentations.provider,
  provider_request_failed: failurePresentations.provider,
  lease_expired: failurePresentations.fallback,
  worker_unexpected_error: failurePresentations.fallback,
};

export function getProcessingFailurePresentation(
  failureCode: string | null,
): ProcessingFailurePresentation {
  if (!failureCode) return failurePresentations.fallback;
  return (
    presentationByFailureCode[failureCode] ?? failurePresentations.fallback
  );
}
