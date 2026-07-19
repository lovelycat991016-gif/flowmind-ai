import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607190002_create_processing_jobs.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("processing jobs migration", () => {
  it("defines the processing lifecycle and durable job contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create type public.processing_job_status as enum",
    );
    for (const status of [
      "'queued'",
      "'running'",
      "'completed'",
      "'failed'",
      "'cancelled'",
    ]) {
      expect(migration).toContain(status);
    }

    expect(migration).toContain("create table public.processing_jobs");
    for (const column of [
      "id uuid primary key",
      "recording_id uuid not null",
      "user_id uuid not null",
      "job_type text not null default 'recording_processing'",
      "status public.processing_job_status not null default 'queued'",
      "attempt_count integer not null default 0",
      "max_attempts integer not null default 3",
      "locked_at timestamptz",
      "locked_by text",
      "started_at timestamptz",
      "completed_at timestamptz",
      "failed_at timestamptz",
      "cancelled_at timestamptz",
      "last_error_code text",
    ]) {
      expect(migration).toContain(column);
    }
  });

  it("constrains job attempts and allows only one active job per recording", () => {
    const migration = readMigration();

    expect(migration).toContain("job_type = 'recording_processing'");
    expect(migration).toContain("attempt_count >= 0");
    expect(migration).toContain("max_attempts between 1 and 10");
    expect(migration).toContain("attempt_count <= max_attempts");
    expect(migration).toContain(
      "create unique index processing_jobs_active_recording_idx",
    );
    expect(migration).toContain("on public.processing_jobs (recording_id)");
    expect(migration).toContain("where status in ('queued', 'running')");
    expect(migration).toContain(
      "create index processing_jobs_owner_status_created_idx",
    );
    expect(migration).toContain(
      "create trigger processing_jobs_set_updated_at",
    );
  });

  it("enforces owner-only access and uploaded recording preconditions", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "alter table public.processing_jobs enable row level security",
    );
    expect(migration).toContain(
      "on public.processing_jobs for select to authenticated",
    );
    expect(migration).toContain(
      "on public.processing_jobs for insert to authenticated",
    );
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toMatch(/exists\s*\(\s*select 1 from public\.recordings/);
    expect(migration).toContain("recordings.status = 'uploaded'");
    expect(migration).toContain(
      "grant select, insert on table public.processing_jobs to authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.processing_jobs from anon",
    );
  });
});
