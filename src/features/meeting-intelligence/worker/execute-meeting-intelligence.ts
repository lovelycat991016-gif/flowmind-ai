import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import type { MeetingIntelligenceProvider } from "@/features/meeting-intelligence/providers/meeting-intelligence-provider";
import { MEETING_INTELLIGENCE_PROMPT_VERSION } from "@/features/ai-providers/prompts/meeting-intelligence-prompt";
import { recordServerAiUsageEvent } from "@/features/ai-usage/record-ai-usage-event";
import { createMeetingIntelligenceWorkerRepository } from "./meeting-intelligence-repository";
import { createInvocationToken } from "@/features/transcription/worker/create-invocation-token";

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
export async function executeNextMeetingIntelligence(input: {
  workerId: string;
  leaseSeconds: number;
  provider: MeetingIntelligenceProvider;
  dependencies: MeetingIntelligenceWorkerDependencies;
}) {
  const invocationToken = createInvocationToken(input.workerId);
  const job = await input.dependencies.claim(
    invocationToken,
    input.leaseSeconds,
  );
  if (!job) return { status: "idle" as const };
  if (job.lockedBy !== invocationToken)
    throw new Error("Unable to execute meeting intelligence.");
  const startedAt = Date.now();
  try {
    const source = await input.dependencies.loadInput(job);
    const result = await input.provider.generate({
      transcriptContent: source.content,
      transcriptLanguage: source.language,
      promptVersion: MEETING_INTELLIGENCE_PROMPT_VERSION,
    });
    await input.dependencies.complete(job, result);
    await recordServerAiUsageEvent({
      userId: job.userId,
      meetingId: job.meetingId,
      meetingIntelligenceId: job.id,
      operationType: "meeting_intelligence_generation",
      provider: result.provider,
      modelIdentifier: result.modelIdentifier,
      outcome: "completed",
      failureCode: null,
      latencyMs: Date.now() - startedAt,
    });
    return { status: "completed" as const, jobId: job.id };
  } catch (error) {
    const failureCode = code(error);
    try {
      await input.dependencies.fail(job, failureCode);
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
      latencyMs: Date.now() - startedAt,
    });
    return { status: "failed" as const, jobId: job.id, code: failureCode };
  }
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
