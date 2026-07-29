import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runbookPath = path.resolve("docs/qa/sprint-17-ai-reliability-analysis.md");

describe("AI reliability analysis runbook", () => {
  it("defines metrics, owner-scoped data, privacy boundaries, and future cost extension", () => {
    const runbook = readFileSync(runbookPath, "utf8");

    expect(runbook).toContain("success rate");
    expect(runbook).toContain("failure breakdown");
    expect(runbook).toContain("p50");
    expect(runbook).toContain("p95");
    expect(runbook).toContain("owner-scoped");
    expect(runbook).toContain("prompt");
    expect(runbook).toContain("transcript");
    expect(runbook).toContain("API key");
    expect(runbook).toContain("input_tokens");
    expect(runbook).toContain("estimated_cost_microunits");
  });
});
