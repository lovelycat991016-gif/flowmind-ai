import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import type { MeetingIntelligenceProvider } from "@/features/meeting-intelligence/providers/meeting-intelligence-provider";
import { createMeetingIntelligenceWorkerRepository } from "./meeting-intelligence-repository";

export type ClaimedMeetingIntelligence = {
  id: string;
  meetingId: string;
  transcriptId: string;
  userId: string;
  lockedBy: string;
};
export type MeetingIntelligenceWorkerDependencies = {
  claim(
    workerId: string,
    leaseSeconds: number,
  ): Promise<ClaimedMeetingIntelligence | null>;
  loadTranscript(
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
  const job = await input.dependencies.claim(
    input.workerId,
    input.leaseSeconds,
  );
  if (!job) return { status: "idle" as const };
  if (job.lockedBy !== input.workerId)
    throw new Error("Unable to execute meeting intelligence.");
  try {
    const transcript = await input.dependencies.loadTranscript(job);
    const result = await input.provider.generate({
      transcriptContent: transcript.content,
      transcriptLanguage: transcript.language,
      promptVersion: "meeting_intelligence/v1",
    });
    await input.dependencies.complete(job, result);
    return { status: "completed" as const, jobId: job.id };
  } catch (error) {
    const failureCode = code(error);
    try {
      await input.dependencies.fail(job, failureCode);
    } catch {
      throw new Error("Unable to execute meeting intelligence.");
    }
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
