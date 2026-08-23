import { z } from "zod";

import type { TranscriptionFailureCode } from "@/entities/transcript/model/transcript";
import type { TranscriptionProvider } from "@/features/transcription/providers/transcription-provider";
import { WhisperProviderError } from "@/features/transcription/providers/openai-whisper-provider";
import { transcriptionFailureCodeSchema } from "@/features/transcription/schemas/transcription-input";

import { claimNextProcessingJob } from "./claim-processing-job";
import { getRecordingAudioForClaimedJob } from "./recording-source";
import {
  completeTranscriptionJob,
  failTranscriptionJob,
} from "./transcription-job-persistence";
import { createInvocationToken } from "./create-invocation-token";
import {
  calculateInvocationDeadline,
  TRANSCRIPTION_EXECUTION_BUDGET_MS,
  TRANSCRIPTION_TERMINAL_RESERVE_MS,
  WHISPER_TIMEOUT_CAP_MS,
} from "./invocation-deadline";

const executionInputSchema = z.object({
  workerId: z.string().trim().min(1).max(64),
  leaseSeconds: z.number().int().min(1).max(3600),
  maxInputBytes: z.number().int().positive(),
});

function safeErrorDiagnostic(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error };

  const redactedMessage = error.message
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(
      /\b(?:token|access[_ -]?key(?:id|secret)?|secret|authorization|cookie|signature)\b\s*(?:=|:)\s*[^\s,;]+/gi,
      (value) => `${value.split(/(?:=|:)/)[0]}=[redacted]`,
    )
    .slice(0, 500);
  const message =
    /^(?:Unable to |(?:Worker|OpenAI|FlowMind|Transcription provider) environment configuration is invalid\.)/.test(
      redactedMessage,
    )
      ? redactedMessage
      : "untrusted_error_message";

  return { name: error.name.slice(0, 100), message };
}

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
  now?: () => number;
}) {
  const parsed = executionInputSchema.safeParse(input);
  if (!parsed.success || typeof input.provider.transcribe !== "function") {
    throw new Error("Unable to execute transcription job.");
  }

  const correlationId = createInvocationToken("transcription-correlation");
  const invocationToken = createInvocationToken(parsed.data.workerId);
  const now = input.now ?? Date.now;
  const startedAtMs = now();

  let job;
  try {
    job = await claimNextProcessingJob({
      workerId: invocationToken,
      leaseSeconds: parsed.data.leaseSeconds,
    });
  } catch (error) {
    console.error("CLAIM_TRANSCRIPTION_JOB_FAILED", {
      error: safeErrorDiagnostic(error),
    });
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
    const deadline = calculateInvocationDeadline({
      nowMs: now(),
      startedAtMs,
      budgetMs: TRANSCRIPTION_EXECUTION_BUDGET_MS,
      terminalReserveMs: TRANSCRIPTION_TERMINAL_RESERVE_MS,
      providerCapMs: WHISPER_TIMEOUT_CAP_MS,
    });
    if (!deadline.providerAllowed) {
      throw new WhisperProviderError("provider_timeout");
    }
    const controller = new AbortController();
    const handleAbort = () => {
      console.info("ALIYUN_ASR_ABORT_SIGNALLED", {
        correlationId,
        elapsedMs: Math.max(0, now() - startedAtMs),
        jobId: job.id,
      });
    };
    controller.signal.addEventListener("abort", handleAbort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(),
      deadline.providerTimeoutMs,
    );
    let result;
    try {
      result = await input.provider.transcribe({
        filename: audio.filename,
        mimeType: audio.mimeType,
        bytes: audio.bytes,
        correlationId,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener("abort", handleAbort);
    }
    await completeTranscriptionJob({
      job,
      workerId: invocationToken,
      result,
    });
    return { status: "completed" as const, jobId: job.id };
  } catch (error) {
    const code = getSafeFailureCode(error);
    console.error("TRANSCRIPTION_WORKER_FAILED", {
      jobId: job.id,
      failureCode: code,
      error: safeErrorDiagnostic(error),
    });
    try {
      await failTranscriptionJob({
        job,
        workerId: invocationToken,
        code,
      });
    } catch (persistError) {
      console.error("FAIL_TRANSCRIPTION_JOB_PERSIST_FAILED", {
        jobId: job.id,
        error: safeErrorDiagnostic(persistError),
      });
      throw new Error("Unable to execute transcription job.");
    }

    return { status: "failed" as const, jobId: job.id, code };
  }
}
