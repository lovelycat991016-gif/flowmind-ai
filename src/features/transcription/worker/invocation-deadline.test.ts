import { describe, expect, it } from "vitest";

import { calculateInvocationDeadline } from "./invocation-deadline";

describe("calculateInvocationDeadline", () => {
  const input = {
    startedAtMs: 1_000,
    budgetMs: 240_000,
    terminalReserveMs: 45_000,
    providerCapMs: 120_000,
  };

  it("reports the full remaining budget at invocation start", () => {
    expect(calculateInvocationDeadline({ ...input, nowMs: 1_000 })).toEqual({
      elapsedMs: 0,
      remainingBudgetMs: 240_000,
      providerTimeoutMs: 120_000,
      providerAllowed: true,
    });
  });

  it("limits provider time to the budget remaining after terminal persistence reserve", () => {
    expect(calculateInvocationDeadline({ ...input, nowMs: 181_000 })).toEqual({
      elapsedMs: 180_000,
      remainingBudgetMs: 60_000,
      providerTimeoutMs: 15_000,
      providerAllowed: true,
    });
  });

  it("does not allow a provider call at the terminal reserve boundary", () => {
    expect(calculateInvocationDeadline({ ...input, nowMs: 196_000 })).toEqual({
      elapsedMs: 195_000,
      remainingBudgetMs: 45_000,
      providerTimeoutMs: 0,
      providerAllowed: false,
    });
  });

  it("does not report a negative remaining budget after deadline", () => {
    expect(calculateInvocationDeadline({ ...input, nowMs: 300_000 })).toEqual({
      elapsedMs: 299_000,
      remainingBudgetMs: 0,
      providerTimeoutMs: 0,
      providerAllowed: false,
    });
  });
});
