import { z } from "zod";

import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";
import type { TranscriptionProvider } from "@/features/transcription/providers/transcription-provider";
import { transcriptionFailureCodeSchema } from "@/features/transcription/schemas/transcription-input";

import { claimNextProcessingJob } from "./claim-processing-job";
import { getRecordingAudioForClaimedJob } from "./recording-source";
import {
  completeTranscriptionJob,
  failTranscriptionJob,
} from "./transcription-job-persistence";
import { createInvocationToken } from "./create-invocation-token";

const executionInputSchema = z.object({
  workerId: z.string().trim().min(1).max(64),
  leaseSeconds: z.number().int().min(1).max(3600),
  maxInputBytes: z.number().int().positive(),
});

function getSafeFailureCode(error: unknown): TranscriptionFailureCode {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    transcriptionFailureCodeSchema.safeParse(error.code).success
  ) {
    return error.code as TranscriptionFailureCode;
  }

  return "worker_unexpected_error";
}

export async function executeNextTranscriptionJob(input: {
  workerId: string;
  leaseSeconds: number;
  maxInputBytes: number;
  provider: TranscriptionProvider;
}) {
  const parsed = executionInputSchema.safeParse(input);
  if (!parsed.success || typeof input.provider.transcribe !== "function") {
    throw new Error("Unable to execute transcription job.");
  }

  const invocationToken = createInvocationToken(parsed.data.workerId);

  let job;
  try {
    job = await claimNextProcessingJob({
      workerId: invocationToken,
      leaseSeconds: parsed.data.leaseSeconds,
    });
  } catch {
    throw new Error("Unable to execute transcription job.");
  }

  if (!job) return { status: "idle" as const };
  if (job.lockedBy !== invocationToken) {
    throw new Error("Unable to execute transcription job.");
  }

  try {
    const audio = await getRecordingAudioForClaimedJob({
      job,
      maxInputBytes: parsed.data.maxInputBytes,
    });
    const result = await input.provider.transcribe({
      filename: audio.filename,
      mimeType: audio.mimeType,
      bytes: audio.bytes,
    });
    await completeTranscriptionJob({
      job,
      workerId: invocationToken,
      result,
    });
    return { status: "completed" as const, jobId: job.id };
  } catch (error) {
    const code = getSafeFailureCode(error);
    try {
      await failTranscriptionJob({
        job,
        workerId: invocationToken,
        code,
      });
    } catch {
      throw new Error("Unable to execute transcription job.");
    }

    return { status: "failed" as const, jobId: job.id, code };
  }
}
