import { describe, expect, it, vi } from "vitest";

import { createServerLogEvent, reportServerEvent } from "./server";

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
});
