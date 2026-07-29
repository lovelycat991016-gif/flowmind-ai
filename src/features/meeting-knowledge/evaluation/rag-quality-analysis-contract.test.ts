import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runbookPath = path.resolve("docs/qa/sprint-17-rag-quality-analysis.md");

describe("RAG quality analysis runbook", () => {
  it("documents evaluation, metrics, threshold scope, embedding limits, and privacy", () => {
    const runbook = readFileSync(runbookPath, "utf8");

    expect(runbook).toContain("hit rate");
    expect(runbook).toContain("empty retrieval rate");
    expect(runbook).toContain("similarity distribution");
    expect(runbook).toContain("similarity threshold");
    expect(runbook).toContain("MockEmbeddingProvider");
    expect(runbook).toContain("prompt");
    expect(runbook).toContain("transcript");
    expect(runbook).toContain("migration");
    expect(runbook).toContain("RPC contract");
  });
});
