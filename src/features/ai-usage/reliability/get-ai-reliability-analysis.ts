import { createClient } from "@/shared/lib/supabase/server";

import {
  analyzeAiReliability,
  type AiReliabilitySummary,
  type AiUsageEventForAnalysis,
} from "./analyze-ai-reliability";

type AiUsageEventRow = {
  provider: string | null;
  model_identifier: string | null;
  operation_type: string;
  outcome: "completed" | "failed";
  failure_code: string | null;
  latency_ms: number | null;
};

export async function getAiReliabilityAnalysis(): Promise<
  AiReliabilitySummary[]
> {
  const { data, error } = await (await createClient())
    .from("ai_usage_events")
    .select(
      "provider,model_identifier,operation_type,outcome,failure_code,latency_ms",
    );

  if (error) throw new Error("Unable to load AI reliability analytics.");

  const events: AiUsageEventForAnalysis[] = (
    (data ?? []) as AiUsageEventRow[]
  ).map((row) => ({
    provider: row.provider,
    modelIdentifier: row.model_identifier,
    operationType: row.operation_type,
    outcome: row.outcome,
    failureCode: row.failure_code,
    latencyMs: row.latency_ms,
  }));

  return analyzeAiReliability(events);
}
