export const KNOWLEDGE_EXECUTION_BUDGET_MS = 240_000;
export const KNOWLEDGE_TERMINAL_RESERVE_MS = 45_000;

export function getKnowledgeEmbeddingTimeout(input: {
  nowMs: number;
  startedAtMs: number;
  budgetMs: number;
  terminalReserveMs: number;
  providerCapMs: number;
}) {
  const remainingBudgetMs = Math.max(0, input.budgetMs - Math.max(0, input.nowMs - input.startedAtMs));
  const timeoutMs = Math.max(0, Math.min(input.providerCapMs, remainingBudgetMs - input.terminalReserveMs));
  return { remainingBudgetMs, timeoutMs, allowed: timeoutMs > 0 };
}
