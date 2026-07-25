import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607250001_repair_meeting_intelligence_worker.sql",
);

const read = () => readFileSync(migrationPath, "utf8").toLowerCase();

describe("meeting intelligence worker repair migration", () => {
  it("restores the missing worker contract without duplicating the base failure field", () => {
    const sql = read();

    for (const field of [
      "attempt_count integer not null default 0",
      "max_attempts integer not null default 3",
      "locked_at timestamptz",
      "locked_by text",
      "lease_expires_at timestamptz",
      "result jsonb",
    ]) {
      expect(sql).toContain(field);
    }

    expect(sql).not.toContain("add column last_error_code");
    expect(sql).not.toContain("alter table public.processing_jobs");
  });

  it("recreates the service-role claim boundary and preserves constraint safety", () => {
    const sql = read();

    expect(sql).toContain(
      "create or replace function public.claim_next_meeting_intelligence",
    );
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain(
      "grant execute on function public.claim_next_meeting_intelligence",
    );
    expect(sql).toContain("meeting_intelligence_attempt_count_valid");
    expect(sql).toContain("meeting_intelligence_max_attempts_valid");
    expect(sql).toContain("meeting_intelligence_result_valid");
  });
});
