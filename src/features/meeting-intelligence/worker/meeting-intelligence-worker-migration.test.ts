import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
const migrationPath = path.resolve(
  "supabase/migrations/202607210002_add_meeting_intelligence_worker.sql",
);
const read = () => readFileSync(migrationPath, "utf8").toLowerCase();
describe("meeting intelligence worker migration", () => {
  it("adds lease, attempts, output, and safe failure fields without changing other tables", () => {
    const sql = read();
    for (const field of [
      "attempt_count integer not null default 0",
      "max_attempts integer not null default 3",
      "locked_at timestamptz",
      "locked_by text",
      "lease_expires_at timestamptz",
      "result jsonb",
      "last_error_code text",
    ])
      expect(sql).toContain(field);
    expect(sql).not.toContain("alter table public.processing_jobs");
  });
  it("claims one queued intelligence row with a service-role lease", () => {
    const sql = read();
    expect(sql).toContain(
      "create or replace function public.claim_next_meeting_intelligence",
    );
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("status = 'running'");
    expect(sql).toContain(
      "grant execute on function public.claim_next_meeting_intelligence",
    );
  });
});
