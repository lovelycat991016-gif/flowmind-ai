import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608170002_fix_claim_next_processing_job_security_definer.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("processing job claim security-definer migration", () => {
  it("authorizes execution with function privileges while preserving the leased atomic claim contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.claim_next_processing_job",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain(
      "alter function public.claim_next_processing_job(text, integer) owner to postgres",
    );
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("current_setting('request.jwt.claim.role'");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("status = 'queued'");
    expect(migration).toContain("attempt_count < max_attempts");
    expect(migration).toContain("status = 'running'");
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain("lease_expires_at");

    for (const field of [
      "id uuid",
      "recording_id uuid",
      "user_id uuid",
      "attempt_count integer",
      "max_attempts integer",
      "locked_at timestamptz",
      "locked_by text",
      "lease_expires_at timestamptz",
    ]) {
      expect(migration).toContain(field);
    }

    expect(migration).toContain(
      "revoke all on function public.claim_next_processing_job(text, integer) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to service_role",
    );
    expect(migration).not.toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to anon",
    );
    expect(migration).not.toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to authenticated",
    );
  });
});
