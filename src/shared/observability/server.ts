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

const dashboardTables = [
  "meetings",
  "action_items",
  "meeting_intelligence",
] as const;

const dashboardQueries = [
  "meetings_total",
  "meetings_active",
  "meetings_archived",
  "meetings_this_week",
  "meetings_recent",
  "meetings_today",
  "meetings_for_intelligence",
  "action_items_open",
  "action_items_completed",
  "intelligence_completed",
  "intelligence_recent",
] as const;

const supabaseRequestErrorCategories = [
  "network",
  "timeout",
  "http_401",
  "http_403",
  "http_429",
  "http_500",
  "http_502",
  "http_503",
  "other_http",
  "unknown",
] as const;

const recordingUploadStages = [
  "intent_meeting_lookup",
  "intent_recording_insert",
  "intent_signed_url",
  "intent_status_update",
  "direct_upload",
  "finalize_recording_lookup",
  "finalize_storage_list",
  "finalize_recording_update",
  "finalize_processing_job",
] as const;

const recordingUploadErrorCategories = [
  "supabase_query",
  "supabase_mutation",
  "storage",
  "network",
  "http_401",
  "http_403",
  "http_404",
  "http_409",
  "http_413",
  "other_http",
] as const;

export type ServerLogCategory = (typeof categories)[number];
export type ServerLogOperation = (typeof operations)[number];
export type ServerLogFailureCode = (typeof failureCodes)[number];
export type DashboardTable = (typeof dashboardTables)[number];
export type DashboardQuery = (typeof dashboardQueries)[number];
export type SupabaseRequestErrorCategory =
  (typeof supabaseRequestErrorCategories)[number];
export type RecordingUploadStage = (typeof recordingUploadStages)[number];
export type RecordingUploadErrorCategory =
  (typeof recordingUploadErrorCategories)[number];

export type SupabaseErrorDiagnostic = {
  table: DashboardTable;
  query: DashboardQuery;
  errorCode?: string;
  errorMessageSummary?:
    | "permission_denied"
    | "relation_not_found"
    | "column_not_found"
    | "request_failed";
  requestErrorCategory?: SupabaseRequestErrorCategory;
  authenticatedUserPresent: boolean;
};

export type RecordingUploadDiagnostic = {
  stage: RecordingUploadStage;
  errorCategory: RecordingUploadErrorCategory;
  errorCode?: string;
  authenticatedUserPresent: boolean;
};

export type ServerLogInput = {
  category: ServerLogCategory;
  operation: ServerLogOperation;
  outcome: "success" | "failure";
  failureCode?: ServerLogFailureCode;
  durationMs?: number;
  supabaseDiagnostic?: SupabaseErrorDiagnostic;
  recordingUploadDiagnostic?: RecordingUploadDiagnostic;
};

export type ServerLogEvent = {
  timestamp: string;
  correlationId: string;
  category: ServerLogCategory;
  operation: ServerLogOperation;
  outcome: "success" | "failure";
  failureCode?: ServerLogFailureCode;
  durationMs?: number;
  supabaseDiagnostic?: SupabaseErrorDiagnostic;
  recordingUploadDiagnostic?: RecordingUploadDiagnostic;
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

function safePostgresCode(value: unknown) {
  return typeof value === "string" && /^[0-9A-Z]{5}$/.test(value)
    ? value
    : undefined;
}

function safeUploadErrorCode(value: unknown) {
  return typeof value === "string" && /^(?:[0-9]{3}|[0-9A-Z]{5})$/.test(value)
    ? value
    : undefined;
}

function safeErrorMessageSummary(code: string | undefined) {
  if (code === "42501") return "permission_denied" as const;
  if (code === "42P01") return "relation_not_found" as const;
  if (code === "42703") return "column_not_found" as const;
  return "request_failed" as const;
}

function supabaseRequestErrorCategory(
  status: unknown,
): SupabaseRequestErrorCategory {
  if (typeof status !== "number" || !Number.isInteger(status)) {
    return "unknown";
  }
  if (status === 0) return "network";
  if (status < 400 || status > 599) return "unknown";

  return (
    ({
      401: "http_401",
      403: "http_403",
      429: "http_429",
      500: "http_500",
      502: "http_502",
      503: "http_503",
    } as const)[status] ?? "other_http"
  );
}

export function createSupabaseErrorDiagnostic(input: {
  table: DashboardTable;
  query: DashboardQuery;
  error: unknown;
  status?: unknown;
  authenticatedUserPresent: boolean;
}): SupabaseErrorDiagnostic {
  const code =
    input.error &&
    typeof input.error === "object" &&
    "code" in input.error
      ? safePostgresCode(input.error.code)
      : undefined;

  return {
    table: input.table,
    query: input.query,
    ...(code ? { errorCode: code } : {}),
    errorMessageSummary: safeErrorMessageSummary(code),
    requestErrorCategory: supabaseRequestErrorCategory(input.status),
    authenticatedUserPresent: input.authenticatedUserPresent,
  };
}

export function createRecordingUploadDiagnostic(
  input: RecordingUploadDiagnostic,
): RecordingUploadDiagnostic {
  return {
    stage: input.stage,
    errorCategory: input.errorCategory,
    ...(safeUploadErrorCode(input.errorCode)
      ? { errorCode: safeUploadErrorCode(input.errorCode) }
      : {}),
    authenticatedUserPresent: input.authenticatedUserPresent,
  };
}

export function recordingUploadErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;

  const candidate =
    "code" in error
      ? error.code
      : "statusCode" in error
        ? error.statusCode
        : undefined;
  return safeUploadErrorCode(candidate);
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
  const supabaseDiagnostic = untrusted.supabaseDiagnostic;
  const recordingUploadDiagnostic = untrusted.recordingUploadDiagnostic;

  return {
    timestamp: new Date().toISOString(),
    correlationId: crypto.randomUUID(),
    category,
    operation,
    outcome,
    ...(failureCode ? { failureCode } : {}),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(supabaseDiagnostic &&
    isMember(dashboardTables, supabaseDiagnostic.table) &&
    isMember(dashboardQueries, supabaseDiagnostic.query) &&
    typeof supabaseDiagnostic.authenticatedUserPresent === "boolean"
      ? {
          supabaseDiagnostic: {
            table: supabaseDiagnostic.table,
            query: supabaseDiagnostic.query,
            ...(safePostgresCode(supabaseDiagnostic.errorCode)
              ? { errorCode: safePostgresCode(supabaseDiagnostic.errorCode) }
              : {}),
            ...(supabaseDiagnostic.errorMessageSummary &&
            [
              "permission_denied",
              "relation_not_found",
              "column_not_found",
              "request_failed",
            ].includes(supabaseDiagnostic.errorMessageSummary)
              ? {
                  errorMessageSummary:
                    supabaseDiagnostic.errorMessageSummary,
                }
              : {}),
            ...(isMember(
              supabaseRequestErrorCategories,
              supabaseDiagnostic.requestErrorCategory,
            )
              ? {
                  requestErrorCategory:
                    supabaseDiagnostic.requestErrorCategory,
                }
              : {}),
            authenticatedUserPresent:
              supabaseDiagnostic.authenticatedUserPresent,
          },
        }
      : {}),
    ...(recordingUploadDiagnostic &&
    isMember(recordingUploadStages, recordingUploadDiagnostic.stage) &&
    isMember(
      recordingUploadErrorCategories,
      recordingUploadDiagnostic.errorCategory,
    ) &&
    typeof recordingUploadDiagnostic.authenticatedUserPresent === "boolean"
      ? {
          recordingUploadDiagnostic: {
            stage: recordingUploadDiagnostic.stage,
            errorCategory: recordingUploadDiagnostic.errorCategory,
            ...(safeUploadErrorCode(recordingUploadDiagnostic.errorCode)
              ? {
                  errorCode: safeUploadErrorCode(
                    recordingUploadDiagnostic.errorCode,
                  ),
                }
              : {}),
            authenticatedUserPresent:
              recordingUploadDiagnostic.authenticatedUserPresent,
          },
        }
      : {}),
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
