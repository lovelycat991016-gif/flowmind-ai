import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202609060001_add_transcription_transient_retry.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("transcription transient retry migration", () => {
  it("adds due-at scheduling without changing the processing lifecycle enum", () => {
    const migration = readMigration();

    expect(migration).toContain("add column next_attempt_at timestamptz");
    expect(migration).toContain(
      "coalesce(next_attempt_at, '-infinity'::timestamptz)",
    );
    expect(migration).not.toContain("alter type public.processing_job_status");
  });

  it("claims only due queued jobs and clears retry diagnostics", () => {
    const migration = readMigration();

    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("pj.next_attempt_at is null");
    expect(migration).toContain(
      "pj.next_attempt_at <= timezone('utc', now())",
    );
    expect(migration).toContain("attempt_count = pj.attempt_count + 1");
    expect(migration).toContain("next_attempt_at = null");
    expect(migration).toContain("last_error_code = null");
  });

  it("requeues only the four frozen transient failure codes", () => {
    const migration = readMigration();

    for (const code of [
      "provider_timeout",
      "provider_rate_limited",
      "provider_unavailable",
      "storage_unavailable",
    ]) {
      expect(migration).toContain(`'${code}'`);
    }

    expect(migration).toContain("interval '1 minute'");
    expect(migration).toContain("interval '5 minutes'");
    expect(migration).toContain("pj.attempt_count < pj.max_attempts");
    expect(migration).toContain("status = 'queued'");
    expect(migration).toContain("status = 'failed'");
  });

  it("preserves function signatures, fencing, and service-role privileges", () => {
    const migration = readMigration();

    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain(
      "lease_expires_at > timezone('utc', now())",
    );
    expect(migration).toContain(
      "alter function public.claim_next_processing_job(text, integer) owner to postgres",
    );
    expect(migration).toContain(
      "revoke all on function public.fail_transcription_job(uuid, text, text) from authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.fail_transcription_job(uuid, text, text) to service_role",
    );
  });
});
