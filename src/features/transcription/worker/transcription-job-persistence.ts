import { z } from "zod";

import type { ClaimedProcessingJob } from "@/features/transcription/worker/claim-processing-job";
import {
  transcriptionFailureCodeSchema,
  transcriptionResultSchema,
} from "@/features/transcription/schemas/transcription-input";
import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";

const workerIdSchema = z.string().trim().min(1).max(100);

const claimedJobSchema = z.object({
  id: z.uuid(),
  recordingId: z.uuid(),
  userId: z.uuid(),
  lockedBy: workerIdSchema,
});

const completionInputSchema = z.object({
  job: claimedJobSchema,
  workerId: workerIdSchema,
  result: transcriptionResultSchema,
});

const failureInputSchema = z.object({
  job: claimedJobSchema,
  workerId: workerIdSchema,
  code: transcriptionFailureCodeSchema,
});

function hasMatchingWorker(
  job: Pick<ClaimedProcessingJob, "lockedBy">,
  workerId: string,
) {
  return job.lockedBy === workerId;
}

export async function completeTranscriptionJob(input: unknown) {
  const parsed = completionInputSchema.safeParse(input);
  if (
    !parsed.success ||
    !hasMatchingWorker(parsed.data.job, parsed.data.workerId)
  ) {
    throw new Error("Unable to complete transcription job.");
  }

  const { job, workerId, result } = parsed.data;
  const supabase = createWorkerServiceRoleClient();
  const { error } = await supabase.rpc("complete_transcription_job", {
    p_content: result.content,
    p_job_id: job.id,
    p_language: result.language,
    p_provider: result.provider,
    p_provider_model: result.providerModel,
    p_recording_id: job.recordingId,
    p_segments: result.segments.map((segment) => ({
      content: segment.content,
      end_ms: segment.endMs,
      segment_index: segment.segmentIndex,
      start_ms: segment.startMs,
    })),
    p_user_id: job.userId,
    p_worker_id: workerId,
  });
  if (error) throw new Error("Unable to complete transcription job.");
}

export async function failTranscriptionJob(input: unknown) {
  const parsed = failureInputSchema.safeParse(input);
  if (
    !parsed.success ||
    !hasMatchingWorker(parsed.data.job, parsed.data.workerId)
  ) {
    throw new Error("Unable to fail transcription job.");
  }

  const supabase = createWorkerServiceRoleClient();
  const { error } = await supabase.rpc("fail_transcription_job", {
    p_failure_code: parsed.data.code,
    p_job_id: parsed.data.job.id,
    p_worker_id: parsed.data.workerId,
  });
  if (error) throw new Error("Unable to fail transcription job.");
}
