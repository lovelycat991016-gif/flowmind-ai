import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608270001_allow_audio_format_failure_codes.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("audio format failure-code migration", () => {
  it("extends only the existing fail_transcription_job function contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create or replace function public.fail_transcription_job(\n  p_job_id uuid,\n  p_worker_id text,\n  p_failure_code text\n)",
    );
    expect(migration).not.toMatch(
      /\b(?:alter|create|drop)\s+table\b|\bcreate\s+policy\b|\bdrop\s+policy\b/,
    );
    expect(migration.match(/create\s+or\s+replace\s+function/g)).toHaveLength(
      1,
    );
  });

  it.each([
    "audio_format_mismatch",
    "audio_format_unsupported",
    "audio_format_unrecognized",
  ])("accepts the new %s failure code", (failureCode) => {
    expect(readMigration()).toContain(`'${failureCode}'`);
  });

  it.each([
    "storage_object_missing",
    "unsupported_audio_type",
    "transcription_input_too_large",
    "invalid_audio",
    "provider_rejected_audio",
    "storage_unavailable",
    "provider_rate_limited",
    "provider_unavailable",
    "provider_timeout",
    "provider_request_failed",
    "lease_expired",
    "worker_unexpected_error",
  ])("retains the existing %s failure code", (failureCode) => {
    expect(readMigration()).toContain(`'${failureCode}'`);
  });

  it("continues to reject values outside the explicit allowlist", () => {
    const migration = readMigration();

    expect(migration).toContain("p_failure_code not in (");
    expect(migration).toContain("raise exception 'invalid failure input'");
    expect(migration).not.toContain("totally_invalid_failure_code");
  });

  it("preserves service-role authorization and lease fencing", () => {
    const migration = readMigration();

    expect(migration).toContain("auth.role()");
    expect(migration).toContain("'service_role'");
    expect(migration).toContain("status = 'running'");
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain(
      "lease_expires_at > timezone('utc', now())",
    );
  });

  it("persists terminal failure and releases every lease field", () => {
    const migration = readMigration();

    expect(migration).toContain("status = 'failed'");
    expect(migration).toContain("last_error_code = p_failure_code");
    expect(migration).toContain("locked_at = null");
    expect(migration).toContain("locked_by = null");
    expect(migration).toContain("lease_expires_at = null");
  });
});
