import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import type { MeetingIntelligenceProvider } from "@/features/meeting-intelligence/providers/meeting-intelligence-provider";
import { MEETING_INTELLIGENCE_PROMPT_VERSION } from "@/features/ai-providers/prompts/meeting-intelligence-prompt";
import { recordServerAiUsageEvent } from "@/features/ai-usage/record-ai-usage-event";
import { createInvocationToken } from "@/features/transcription/worker/create-invocation-token";
import {
  calculateInvocationDeadline,
  TRANSCRIPTION_EXECUTION_BUDGET_MS,
  TRANSCRIPTION_TERMINAL_RESERVE_MS,
} from "@/features/transcription/worker/invocation-deadline";

import { createMeetingIntelligenceWorkerRepository } from "./meeting-intelligence-repository";

const MEETING_INTELLIGENCE_PROVIDER_WINDOW_MS = 30_000;
const MEETING_INTELLIGENCE_MAX_JOBS_PER_INVOCATION = 3;

export type ClaimedMeetingIntelligence = {
  id: string;
  meetingId: string;
  transcriptId: string | null;
  userId: string;
  lockedBy: string;
};
export type MeetingIntelligenceWorkerDependencies = {
  claim(
    workerId: string,
    leaseSeconds: number,
  ): Promise<ClaimedMeetingIntelligence | null>;
  loadInput(
    job: ClaimedMeetingIntelligence,
  ): Promise<{ content: string; language: string | null }>;
  complete(
    job: ClaimedMeetingIntelligence,
    result: MeetingIntelligenceResult,
  ): Promise<void>;
  fail(
    job: ClaimedMeetingIntelligence,
    code: MeetingIntelligenceFailureCode,
  ): Promise<void>;
};
function code(error: unknown): MeetingIntelligenceFailureCode {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  )
    return error.code as MeetingIntelligenceFailureCode;
  return "worker_unexpected_error";
}

type ProcessedJobResult =
  | { status: "completed"; jobId: string }
  | {
      status: "failed";
      jobId: string;
      code: MeetingIntelligenceFailureCode;
    };

type BatchStopReason = "queue_empty" | "budget_exhausted" | "job_limit_reached";

function hasSafeClaimBudget(input: { now: () => number; startedAtMs: number }) {
  const deadline = calculateInvocationDeadline({
    nowMs: input.now(),
    startedAtMs: input.startedAtMs,
    budgetMs: TRANSCRIPTION_EXECUTION_BUDGET_MS,
    terminalReserveMs: TRANSCRIPTION_TERMINAL_RESERVE_MS,
    providerCapMs: MEETING_INTELLIGENCE_PROVIDER_WINDOW_MS,
  });

  return deadline.providerTimeoutMs === MEETING_INTELLIGENCE_PROVIDER_WINDOW_MS;
}

async function processClaimedJob(input: {
  job: ClaimedMeetingIntelligence;
  provider: MeetingIntelligenceProvider;
  dependencies: MeetingIntelligenceWorkerDependencies;
  now: () => number;
}): Promise<ProcessedJobResult> {
  const { job, provider, dependencies, now } = input;
  const startedAt = now();
  let result: MeetingIntelligenceResult;

  try {
    const source = await dependencies.loadInput(job);
    result = await provider.generate({
      transcriptContent: source.content,
      transcriptLanguage: source.language,
      promptVersion: MEETING_INTELLIGENCE_PROMPT_VERSION,
    });
  } catch (error) {
    const failureCode = code(error);
    try {
      await dependencies.fail(job, failureCode);
    } catch {
      throw new Error("Unable to execute meeting intelligence.");
    }
    await recordServerAiUsageEvent({
      userId: job.userId,
      meetingId: job.meetingId,
      meetingIntelligenceId: job.id,
      operationType: "meeting_intelligence_generation",
      provider: null,
      modelIdentifier: null,
      outcome: "failed",
      failureCode,
      latencyMs: now() - startedAt,
    });
    return { status: "failed", jobId: job.id, code: failureCode };
  }

  try {
    await dependencies.complete(job, result);
  } catch {
    throw new Error("Unable to execute meeting intelligence.");
  }
  await recordServerAiUsageEvent({
    userId: job.userId,
    meetingId: job.meetingId,
    meetingIntelligenceId: job.id,
    operationType: "meeting_intelligence_generation",
    provider: result.provider,
    modelIdentifier: result.modelIdentifier,
    outcome: "completed",
    failureCode: null,
    latencyMs: now() - startedAt,
  });
  return { status: "completed", jobId: job.id };
}

export async function executeNextMeetingIntelligence(input: {
  workerId: string;
  leaseSeconds: number;
  provider: MeetingIntelligenceProvider;
  dependencies: MeetingIntelligenceWorkerDependencies;
  now?: () => number;
}) {
  const invocationToken = createInvocationToken(input.workerId);
  const now = input.now ?? Date.now;
  const startedAtMs = now();
  const jobs: ProcessedJobResult[] = [];
  let stopReason: BatchStopReason = "budget_exhausted";

  while (jobs.length < MEETING_INTELLIGENCE_MAX_JOBS_PER_INVOCATION) {
    if (!hasSafeClaimBudget({ now, startedAtMs })) {
      stopReason = "budget_exhausted";
      break;
    }

    let job;
    try {
      job = await input.dependencies.claim(invocationToken, input.leaseSeconds);
    } catch {
      throw new Error("Unable to execute meeting intelligence.");
    }

    if (!job) {
      stopReason = "queue_empty";
      break;
    }
    if (job.lockedBy !== invocationToken) {
      throw new Error("Unable to execute meeting intelligence.");
    }

    jobs.push(
      await processClaimedJob({
        job,
        provider: input.provider,
        dependencies: input.dependencies,
        now,
      }),
    );
  }

  if (jobs.length === MEETING_INTELLIGENCE_MAX_JOBS_PER_INVOCATION) {
    stopReason = "job_limit_reached";
  }
  if (jobs.length === 0) {
    return stopReason === "budget_exhausted"
      ? { status: "idle" as const, stopReason }
      : { status: "idle" as const };
  }

  return { status: "processed" as const, jobs, stopReason };
}

export async function executeNextMeetingIntelligenceWithServiceRole(input: {
  workerId: string;
  leaseSeconds: number;
  provider: MeetingIntelligenceProvider;
}) {
  return executeNextMeetingIntelligence({
    ...input,
    dependencies: createMeetingIntelligenceWorkerRepository(),
  });
}
