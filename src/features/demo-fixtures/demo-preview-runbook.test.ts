import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const runbookPath = path.resolve("docs/qa/sprint-16-demo-qa.md");
const packagePath = path.resolve("package.json");

describe("Sprint 16 Preview demo runbook contract", () => {
  it("documents the guarded Preview fixture lifecycle and RAG A/B acceptance", () => {
    const document = readFileSync(runbookPath, "utf8");

    expect(document).toContain("DEMO_FIXTURES_ENABLED=true");
    expect(document).toContain("VERCEL_ENV=preview");
    expect(document).toContain("VERCEL_ENV=production");
    expect(document).toContain("AI_PROVIDER=deepseek");
    expect(document).toContain("DEEPSEEK_API_KEY");
    expect(document).toContain("DEEPSEEK_MODEL");
    expect(document).toContain("EMBEDDING_PROVIDER=mock");
    expect(document).toContain("State A");
    expect(document).toContain("State B");
    expect(document).toContain("知识库来源");
    expect(document).toContain("知识库当前不可用");
    expect(document).toContain("must not run in Production");
  });

  it("exposes reproducible seed, reset, and verify commands", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["demo:fixtures:seed"]).toContain("run-demo-fixtures.ts seed");
    expect(packageJson.scripts["demo:fixtures:reset"]).toContain("run-demo-fixtures.ts reset");
    expect(packageJson.scripts["demo:fixtures:verify"]).toContain("run-demo-fixtures.ts verify");
    expect(packageJson.scripts["demo:fixtures:seed"]).toContain("--config vitest.config.ts");
    expect(packageJson.scripts["demo:fixtures:reset"]).toContain("--config vitest.config.ts");
    expect(packageJson.scripts["demo:fixtures:verify"]).toContain("--config vitest.config.ts");
  });

  it("records the completed runtime acceptance evidence", () => {
    const document = readFileSync(runbookPath, "utf8");

    expect(document).toContain("## Runtime Acceptance Record");
    expect(document).toContain("Supabase stack running");
    expect(document).toContain("demo seed");
    expect(document).toContain("verify");
    expect(document).toContain("reset");
    expect(document).toContain("seed recovery");
    expect(document).toContain("Meeting Intelligence Demo");
    expect(document).toContain("Copilot RAG sources");
    expect(document).toContain("Knowledge unavailable fallback");
    expect(document).toContain("owner isolation");
    expect(document).toContain("Passed");
  });
});
