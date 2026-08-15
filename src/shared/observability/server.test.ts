import { describe, expect, it, vi } from "vitest";

import {
  createRecordingUploadDiagnostic,
  createServerLogEvent,
  createSupabaseErrorDiagnostic,
  reportServerEvent,
} from "./server";

describe("server observability", () => {
  it("creates a correlated event from allowlisted operational metadata", () => {
    expect(
      createServerLogEvent({
        category: "supabase",
        operation: "dashboard_meeting_query",
        outcome: "failure",
        failureCode: "supabase_query_failed",
        durationMs: 24,
      }),
    ).toMatchObject({
      category: "supabase",
      operation: "dashboard_meeting_query",
      outcome: "failure",
      failureCode: "supabase_query_failed",
      durationMs: 24,
      correlationId: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it("drops untrusted payload, credential, and error fields before logging", () => {
    const sink = vi.fn();
    const event = reportServerEvent(
      {
        category: "provider",
        operation: "meeting_intelligence_generation",
        outcome: "failure",
        failureCode: "provider_request_failed",
        transcript: "private transcript",
        prompt: "private prompt",
        audioPath: "owner/meeting/recording.webm",
        authorization: "Bearer private-token",
        apiKey: "provider-secret",
        error: new Error("raw provider error"),
      } as never,
      sink,
    );

    expect(JSON.stringify(event)).not.toMatch(
      /private transcript|private prompt|recording\.webm|private-token|provider-secret|raw provider error/,
    );
    expect(sink).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it("records allowlisted dashboard diagnostics without serializing Supabase messages", () => {
    const diagnostic = createSupabaseErrorDiagnostic({
      table: "meetings",
      query: "meetings_total",
      error: {
        code: "42501",
        message:
          "permission denied for table meetings Authorization: Bearer private-token",
      },
      authenticatedUserPresent: true,
    });
    const event = createServerLogEvent({
      category: "supabase",
      operation: "dashboard_meeting_query",
      outcome: "failure",
      failureCode: "supabase_query_failed",
      supabaseDiagnostic: diagnostic,
    });

    expect(event.supabaseDiagnostic).toEqual({
      table: "meetings",
      query: "meetings_total",
      errorCode: "42501",
      errorMessageSummary: "permission_denied",
      requestErrorCategory: "unknown",
      authenticatedUserPresent: true,
    });
    expect(JSON.stringify(event)).not.toMatch(
      /private-token|Authorization|Bearer|permission denied for table meetings/,
    );
  });

  it.each([
    [401, "http_401"],
    [403, "http_403"],
    [429, "http_429"],
    [500, "http_500"],
    [502, "http_502"],
    [503, "http_503"],
    [418, "other_http"],
    [0, "network"],
    [undefined, "unknown"],
    [null, "unknown"],
    [-1, "unknown"],
    [401.5, "unknown"],
    [600, "unknown"],
  ] as const)("classifies a Supabase response status %s as %s", (status, requestErrorCategory) => {
    const diagnostic = createSupabaseErrorDiagnostic({
      table: "meetings",
      query: "meetings_total",
      error: {
        code: "",
        message:
          "Authorization: Bearer private-token https://supabase.example/rest/v1/meetings",
        details: "private response body cookie=session-cookie user=owner-id",
        hint: "private SQL hint JWT=private-jwt",
      },
      ...(status === undefined ? {} : { status }),
      authenticatedUserPresent: true,
    });
    const event = createServerLogEvent({
      category: "supabase",
      operation: "dashboard_meeting_query",
      outcome: "failure",
      failureCode: "supabase_query_failed",
      supabaseDiagnostic: diagnostic,
    });

    expect(event.supabaseDiagnostic).toEqual(
      expect.objectContaining({
        table: "meetings",
        query: "meetings_total",
        requestErrorCategory,
        authenticatedUserPresent: true,
      }),
    );
    expect(JSON.stringify(event)).not.toMatch(
      /Authorization|Bearer|private-token|supabase\.example|response body|cookie|owner-id|SQL hint|JWT|private-jwt/,
    );
  });

  it("records an allowlisted recording upload diagnostic without raw transport data", () => {
    const event = createServerLogEvent({
      category: "storage",
      operation: "recording_upload_intent",
      outcome: "failure",
      failureCode: "storage_operation_failed",
      recordingUploadDiagnostic: createRecordingUploadDiagnostic({
        stage: "direct_upload",
        errorCategory: "http_403",
        errorCode: "403",
        authenticatedUserPresent: true,
      }),
    });

    expect(event.recordingUploadDiagnostic).toEqual({
      stage: "direct_upload",
      errorCategory: "http_403",
      errorCode: "403",
      authenticatedUserPresent: true,
    });
    expect(JSON.stringify(event)).not.toMatch(/signed|token|cookie|owner|secret/i);
  });

  it("drops non-allowlisted recording upload values before serializing", () => {
    const event = createServerLogEvent({
      category: "storage",
      operation: "recording_upload_finalize",
      outcome: "failure",
      recordingUploadDiagnostic: {
        stage: "finalize_storage_list",
        errorCategory: "storage",
        errorCode: "Bearer private-token" as string,
        authenticatedUserPresent: true,
      },
    });

    expect(event.recordingUploadDiagnostic).toEqual({
      stage: "finalize_storage_list",
      errorCategory: "storage",
      authenticatedUserPresent: true,
    });
    expect(JSON.stringify(event)).not.toMatch(/bearer|private-token/i);
  });
});
