export type AiUsageEventForAnalysis = {
  provider: string | null;
  modelIdentifier: string | null;
  operationType: string;
  outcome: "completed" | "failed";
  failureCode: string | null;
  latencyMs: number | null;
};

export type AiReliabilitySummary = {
  provider: string;
  modelIdentifier: string;
  operationType: string;
  requestCount: number;
  successRate: number;
  failureBreakdown: Record<string, number>;
  latency: {
    sampleCount: number;
    minMs: number | null;
    maxMs: number | null;
    averageMs: number | null;
    p50Ms: number | null;
    p95Ms: number | null;
  };
};

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) return null;
  return sortedValues[Math.ceil(sortedValues.length * percentileValue) - 1];
}

export function analyzeAiReliability(
  events: AiUsageEventForAnalysis[],
): AiReliabilitySummary[] {
  const groups = new Map<string, AiUsageEventForAnalysis[]>();

  for (const event of events) {
    const key = [
      event.provider ?? "unknown",
      event.modelIdentifier ?? "unknown",
      event.operationType,
    ].join("\u0000");
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group]) => {
      const [provider, modelIdentifier, operationType] = key.split("\u0000");
      const latencies = group
        .map((event) => event.latencyMs)
        .filter((latency): latency is number => latency !== null)
        .sort((left, right) => left - right);
      const failureBreakdown: Record<string, number> = {};
      for (const event of group) {
        if (event.outcome !== "failed") continue;
        const failureCode = event.failureCode ?? "unknown_failure";
        failureBreakdown[failureCode] =
          (failureBreakdown[failureCode] ?? 0) + 1;
      }

      const completedCount = group.filter(
        (event) => event.outcome === "completed",
      ).length;
      const latencyTotal = latencies.reduce((total, latency) => total + latency, 0);

      return {
        provider,
        modelIdentifier,
        operationType,
        requestCount: group.length,
        successRate: completedCount / group.length,
        failureBreakdown,
        latency: {
          sampleCount: latencies.length,
          minMs: latencies[0] ?? null,
          maxMs: latencies.at(-1) ?? null,
          averageMs:
            latencies.length === 0 ? null : latencyTotal / latencies.length,
          p50Ms: percentile(latencies, 0.5),
          p95Ms: percentile(latencies, 0.95),
        },
      };
    });
}
