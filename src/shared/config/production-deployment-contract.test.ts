import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const envExamplePath = path.resolve(".env.example");
const checklistPath = path.resolve(
  "docs/qa/sprint-17-production-deployment.md",
);
const vercelConfigPath = path.resolve("vercel.json");

describe("production deployment contract", () => {
  it("keeps the committed environment example public and non-sensitive", () => {
    const example = readFileSync(envExamplePath, "utf8");

    expect(example).toContain("NEXT_PUBLIC_APP_URL=");
    expect(example).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(example).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=");
    expect(example).toContain("AI_PROVIDER=deepseek");
    expect(example).toContain("DEEPSEEK_MODEL=deepseek-chat");
    expect(example).toContain("EMBEDDING_PROVIDER=mock");
    expect(example).not.toMatch(/^CRON_SECRET=/m);
    expect(example).not.toMatch(/^SUPABASE_SERVICE_ROLE_KEY=/m);
    expect(example).not.toMatch(/^DEEPSEEK_API_KEY=/m);
    expect(example).not.toMatch(/^OPENAI_API_KEY=/m);
    expect(example).not.toMatch(/^EMBEDDING_API_KEY=/m);
  });

  it("documents Vercel server-only secrets and ordered Supabase migration deployment", () => {
    const checklist = readFileSync(checklistPath, "utf8");

    expect(checklist).toContain("CRON_SECRET");
    expect(checklist).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(checklist).toContain("DEEPSEEK_API_KEY");
    expect(checklist).toContain("OPENAI_API_KEY");
    expect(checklist).toMatch(/must not use a\s+`NEXT_PUBLIC_` prefix/);
    expect(checklist).toContain("supabase migration list");
    expect(checklist).toContain("supabase db push");
    expect(checklist).toContain("Vercel Cron");
    expect(checklist).toContain("Rollback");
  });

  it("schedules the protected knowledge worker alongside existing workers", () => {
    const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8")) as {
      crons: { path: string; schedule: string }[];
    };

    expect(vercelConfig.crons).toContainEqual({
      path: "/api/cron/meeting-knowledge",
      schedule: "*/5 * * * *",
    });
  });
});
