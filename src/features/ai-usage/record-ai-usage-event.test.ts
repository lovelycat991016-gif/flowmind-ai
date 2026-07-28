import { describe, expect, it, vi } from "vitest";

import { recordAiUsageEvent } from "./record-ai-usage-event";

describe("recordAiUsageEvent", () => {
  it("records safe provider metadata for a successful owner-scoped Copilot call", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAiUsageEvent(
      {
        from: vi.fn().mockReturnValue({ insert }),
      } as never,
      {
        userId: "5b13f6b1-1456-4cc1-bbb4-f85b253f6d34",
        meetingId: "8f641098-b6a2-4f8c-84ad-38820f430391",
        operationType: "meeting_copilot_response",
        provider: "deepseek",
        modelIdentifier: "deepseek-chat",
        outcome: "completed",
        failureCode: null,
        latencyMs: 120,
      },
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        operation_type: "meeting_copilot_response",
        provider: "deepseek",
        model_identifier: "deepseek-chat",
        latency_ms: 120,
        input_tokens: null,
        output_tokens: null,
      }),
    );
  });

  it("does not persist raw failure details", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAiUsageEvent(
      { from: vi.fn().mockReturnValue({ insert }) } as never,
      {
        userId: "5b13f6b1-1456-4cc1-bbb4-f85b253f6d34",
        meetingId: "8f641098-b6a2-4f8c-84ad-38820f430391",
        operationType: "meeting_copilot_response",
        provider: "deepseek",
        modelIdentifier: "deepseek-chat",
        outcome: "failed",
        failureCode: "provider_timeout",
        latencyMs: 500,
      },
    );
    expect(insert.mock.calls[0][0]).not.toHaveProperty("error_message");
    expect(insert.mock.calls[0][0]).toMatchObject({
      outcome: "failed",
      failure_code: "provider_timeout",
    });
  });

  it("ignores untrusted prompt, transcript, key, and raw provider fields", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAiUsageEvent(
      { from: vi.fn().mockReturnValue({ insert }) } as never,
      {
        userId: "5b13f6b1-1456-4cc1-bbb4-f85b253f6d34",
        meetingId: "8f641098-b6a2-4f8c-84ad-38820f430391",
        operationType: "meeting_copilot_response",
        provider: "deepseek",
        modelIdentifier: "deepseek-chat",
        outcome: "failed",
        failureCode: "request_failed",
        latencyMs: 500,
        prompt: "private prompt",
        transcript: "private transcript",
        apiKey: "private-api-key",
        rawProviderError: "provider secret",
      } as never,
    );

    const row = JSON.stringify(insert.mock.calls[0][0]);
    expect(row).not.toContain("private prompt");
    expect(row).not.toContain("private transcript");
    expect(row).not.toContain("private-api-key");
    expect(row).not.toContain("provider secret");
  });
});
