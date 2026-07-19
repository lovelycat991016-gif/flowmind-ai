const categories = [
  "request",
  "supabase",
  "storage",
  "worker",
  "provider",
] as const;

const operations = [
  "dashboard_meeting_query",
  "meeting_create",
  "meeting_rename",
  "recording_upload_intent",
  "recording_upload_finalize",
  "recording_query",
  "processing_job_query",
  "transcript_query",
  "intelligence_query",
  "transcription_worker",
  "meeting_intelligence_worker",
] as const;

const failureCodes = [
  "supabase_query_failed",
  "supabase_mutation_failed",
  "storage_operation_failed",
  "worker_execution_failed",
  "provider_request_failed",
  "unexpected",
] as const;

export type ServerLogCategory = (typeof categories)[number];
export type ServerLogOperation = (typeof operations)[number];
export type ServerLogFailureCode = (typeof failureCodes)[number];

export type ServerLogInput = {
  category: ServerLogCategory;
  operation: ServerLogOperation;
  outcome: "success" | "failure";
  failureCode?: ServerLogFailureCode;
  durationMs?: number;
};

export type ServerLogEvent = {
  timestamp: string;
  correlationId: string;
  category: ServerLogCategory;
  operation: ServerLogOperation;
  outcome: "success" | "failure";
  failureCode?: ServerLogFailureCode;
  durationMs?: number;
};

export type ServerLogSink = (serializedEvent: string) => void;

function isMember<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function safeDuration(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;

  return Math.min(Math.max(Math.round(value), 0), 600_000);
}

export function createServerLogEvent(input: ServerLogInput): ServerLogEvent {
  const untrusted = input as Partial<ServerLogInput>;
  const category = isMember(categories, untrusted.category)
    ? untrusted.category
    : "request";
  const operation = isMember(operations, untrusted.operation)
    ? untrusted.operation
    : "dashboard_meeting_query";
  const outcome =
    untrusted.outcome === "success" || untrusted.outcome === "failure"
      ? untrusted.outcome
      : "failure";
  const failureCode = isMember(failureCodes, untrusted.failureCode)
    ? untrusted.failureCode
    : undefined;
  const durationMs = safeDuration(untrusted.durationMs);

  return {
    timestamp: new Date().toISOString(),
    correlationId: crypto.randomUUID(),
    category,
    operation,
    outcome,
    ...(failureCode ? { failureCode } : {}),
    ...(durationMs === undefined ? {} : { durationMs }),
  };
}

export function reportServerEvent(
  input: ServerLogInput,
  sink: ServerLogSink = console.error,
) {
  const event = createServerLogEvent(input);
  sink(JSON.stringify(event));
  return event;
}
