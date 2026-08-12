import { z } from "zod";

import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";

const claimInputSchema = z.object({
  workerId: z.string().trim().min(1).max(100),
  leaseSeconds: z.number().int().min(1).max(3600),
});

type ClaimedProcessingJobRow = {
  id: string;
  recording_id: string;
  user_id: string;
  attempt_count: number;
  max_attempts: number;
  locked_at: string;
  locked_by: string;
  lease_expires_at: string;
};

export type ClaimedProcessingJob = {
  id: string;
  recordingId: string;
  userId: string;
  attemptCount: number;
  maxAttempts: number;
  lockedAt: string;
  lockedBy: string;
  leaseExpiresAt: string;
};

function mapClaimedProcessingJob(
  row: ClaimedProcessingJobRow,
): ClaimedProcessingJob {
  return {
    id: row.id,
    recordingId: row.recording_id,
    userId: row.user_id,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export async function claimNextProcessingJob(input: unknown) {
  const parsed = claimInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Unable to claim processing job.");

  const supabase = createWorkerServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_next_processing_job", {
    p_lease_seconds: parsed.data.leaseSeconds,
    p_worker_id: parsed.data.workerId,
  });
  if (error) throw new Error("Unable to claim processing job.");

  return data ? mapClaimedProcessingJob(data as ClaimedProcessingJobRow) : null;
}
