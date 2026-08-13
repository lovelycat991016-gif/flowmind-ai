import { describe, expect, it, vi } from "vitest";

import {
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
      authenticatedUserPresent: true,
    });
    expect(JSON.stringify(event)).not.toMatch(
      /private-token|Authorization|Bearer|permission denied for table meetings/,
    );
  });
});
