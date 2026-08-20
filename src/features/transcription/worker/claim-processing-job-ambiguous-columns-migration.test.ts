import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608190001_fix_claim_next_processing_job_ambiguous_columns.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("processing job claim ambiguous-columns migration", () => {
  it("qualifies processing job reads while preserving the RPC and privilege contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.claim_next_processing_job(",
    );
    expect(migration).toContain("p_worker_id text");
    expect(migration).toContain("p_lease_seconds integer");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain(
      "alter function public.claim_next_processing_job(text, integer) owner to postgres",
    );
    expect(migration).toContain("from public.processing_jobs as pj");
    expect(migration).toContain("update public.processing_jobs as pj");

    for (const reference of [
      "pj.status = 'running'",
      "pj.lease_expires_at < timezone('utc', now())",
      "pj.attempt_count >= pj.max_attempts",
      "pj.status = 'queued'",
      "pj.attempt_count < pj.max_attempts",
      "order by pj.created_at",
      "attempt_count = pj.attempt_count + 1",
      "started_at = coalesce(pj.started_at",
      "where pj.id = claimable_job.id",
      "for update skip locked",
    ]) {
      expect(migration).toContain(reference);
    }

    expect(migration).not.toMatch(/where\s+status\s*=/);
    expect(migration).not.toMatch(/and\s+lease_expires_at\s*</);
    expect(migration).not.toMatch(/and\s+attempt_count\s*[<>]=?\s*max_attempts/);
    expect(migration).not.toMatch(/order by\s+created_at/);

    expect(migration).toContain(
      "revoke all on function public.claim_next_processing_job(text, integer) from public",
    );
    expect(migration).toContain(
      "revoke all on function public.claim_next_processing_job(text, integer) from anon",
    );
    expect(migration).toContain(
      "revoke all on function public.claim_next_processing_job(text, integer) from authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to service_role",
    );
  });
});
