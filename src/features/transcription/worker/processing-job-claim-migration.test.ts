import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607200002_add_processing_job_leases.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("processing job claim migration", () => {
  it("adds a lease without changing the processing job status enum", () => {
    const migration = readMigration();

    expect(migration).toContain("add column lease_expires_at timestamptz");
    expect(migration).toContain("create index processing_jobs_claimable_idx");
    expect(migration).not.toContain("alter type public.processing_job_status");
    expect(migration).not.toContain("create table public.transcripts");
  });

  it("claims one queued job atomically with a worker lease", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.claim_next_processing_job",
    );
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("status = 'queued'");
    expect(migration).toContain("attempt_count < max_attempts");
    expect(migration).toContain("status = 'running'");
    expect(migration).toContain(
      "attempt_count = processing_jobs.attempt_count + 1",
    );
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain("locked_at = timezone('utc', now())");
    expect(migration).toContain("lease_expires_at");
  });

  it("restricts claim execution to the service role", () => {
    const migration = readMigration();

    expect(migration).toContain("auth.role()");
    expect(migration).toContain("'service_role'");
    expect(migration).toContain(
      "revoke all on function public.claim_next_processing_job(text, integer) from public",
    );
    expect(migration).toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to service_role",
    );
  });
});
