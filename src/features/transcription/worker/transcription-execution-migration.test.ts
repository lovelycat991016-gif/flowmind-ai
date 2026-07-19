import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607200003_add_transcription_execution.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("transcription execution migration", () => {
  it("completes a leased job and persists its transcript and segments atomically", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.complete_transcription_job",
    );
    expect(migration).toContain("insert into public.transcripts");
    expect(migration).toContain("insert into public.transcript_segments");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain("lease_expires_at > timezone('utc', now())");
    expect(migration).toContain("join public.meetings");
    expect(migration).toContain("meetings.user_id = processing_jobs.user_id");
  });

  it("records only safe failure codes for a matching active worker lease", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.fail_transcription_job",
    );
    expect(migration).toContain("status = 'failed'");
    expect(migration).toContain("last_error_code = p_failure_code");
    expect(migration).toContain("provider_rate_limited");
    expect(migration).toContain("locked_by = p_worker_id");
  });

  it("limits execution RPCs to the service role without changing lifecycle states", () => {
    const migration = readMigration();

    expect(migration).toContain("auth.role()");
    expect(migration).toContain("'service_role'");
    expect(migration).toContain(
      "grant execute on function public.complete_transcription_job",
    );
    expect(migration).toContain(
      "grant execute on function public.fail_transcription_job",
    );
    expect(migration).not.toContain("alter type public.processing_job_status");
  });
});
