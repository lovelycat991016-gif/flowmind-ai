export const TRANSCRIPTION_EXECUTION_BUDGET_MS = 240_000;
export const TRANSCRIPTION_TERMINAL_RESERVE_MS = 45_000;
export const WHISPER_TIMEOUT_CAP_MS = 120_000;

export function calculateInvocationDeadline(input: {
  nowMs: number;
  startedAtMs: number;
  budgetMs: number;
  terminalReserveMs: number;
  providerCapMs: number;
}) {
  const elapsedMs = Math.max(0, input.nowMs - input.startedAtMs);
  const remainingBudgetMs = Math.max(0, input.budgetMs - elapsedMs);
  const providerTimeoutMs = Math.max(
    0,
    Math.min(
      input.providerCapMs,
      remainingBudgetMs - input.terminalReserveMs,
    ),
  );

  return {
    elapsedMs,
    remainingBudgetMs,
    providerTimeoutMs,
    providerAllowed: providerTimeoutMs > 0,
  };
}
