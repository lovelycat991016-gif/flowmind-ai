import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getAiReliabilityAnalysis } from "./get-ai-reliability-analysis";

afterEach(() => createClientMock.mockReset());

describe("getAiReliabilityAnalysis", () => {
  it("aggregates only owner-visible rows through the authenticated Supabase client", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [
        {
          provider: "deepseek",
          model_identifier: "deepseek-chat",
          operation_type: "meeting_intelligence_generation",
          outcome: "completed",
          failure_code: null,
          latency_ms: 240,
        },
      ],
      error: null,
    });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select }),
    });

    await expect(getAiReliabilityAnalysis()).resolves.toEqual([
      {
        provider: "deepseek",
        modelIdentifier: "deepseek-chat",
        operationType: "meeting_intelligence_generation",
        requestCount: 1,
        successRate: 1,
        failureBreakdown: {},
        latency: {
          sampleCount: 1,
          minMs: 240,
          maxMs: 240,
          averageMs: 240,
          p50Ms: 240,
          p95Ms: 240,
        },
      },
    ]);
    expect(select).toHaveBeenCalledWith(
      "provider,model_identifier,operation_type,outcome,failure_code,latency_ms",
    );
  });

  it("does not select prompt, transcript, token, cost, or provider error data", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue({ select }),
    });

    await getAiReliabilityAnalysis();

    const selectedColumns = select.mock.calls[0][0] as string;
    expect(selectedColumns).not.toContain("input_tokens");
    expect(selectedColumns).not.toContain("output_tokens");
    expect(selectedColumns).not.toContain("estimated_cost_microunits");
    expect(selectedColumns).not.toContain("prompt");
    expect(selectedColumns).not.toContain("transcript");
    expect(selectedColumns).not.toContain("error_message");
  });
});
