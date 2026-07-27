type AiUsageEvent = {
  userId: string;
  meetingId: string;
  meetingIntelligenceId?: string;
  operationType: "meeting_intelligence_generation" | "meeting_copilot_response";
  provider: string | null;
  modelIdentifier: string | null;
  outcome: "completed" | "failed";
  failureCode: string | null;
  latencyMs: number;
  attemptNumber?: number;
};

type AiUsageClient = {
  from(table: "ai_usage_events"): {
    insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }>;
  };
};

export async function recordAiUsageEvent(
  client: AiUsageClient,
  event: AiUsageEvent,
) {
  const { error } = await client.from("ai_usage_events").insert({
    user_id: event.userId,
    meeting_id: event.meetingId,
    meeting_intelligence_id: event.meetingIntelligenceId ?? null,
    operation_type: event.operationType,
    attempt_number: event.attemptNumber ?? 1,
    provider: event.provider,
    model_identifier: event.modelIdentifier,
    input_tokens: null,
    output_tokens: null,
    estimated_cost_microunits: null,
    latency_ms: event.latencyMs,
    outcome: event.outcome,
    failure_code: event.failureCode,
  });
  if (error) throw new Error("Unable to record AI usage event.");
}

export async function recordServerAiUsageEvent(event: AiUsageEvent) {
  try {
    await recordAiUsageEvent(createWorkerServiceRoleClient(), event);
  } catch {
    // Observability must never alter the user-visible AI operation.
  }
}
import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";
