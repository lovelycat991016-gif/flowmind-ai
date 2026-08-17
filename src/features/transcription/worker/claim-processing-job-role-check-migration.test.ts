import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608170001_fix_claim_next_processing_job_role_check.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("processing job claim role-check migration", () => {
  it("uses the request JWT role while preserving the leased atomic claim contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "current_setting('request.jwt.claim.role', true)",
    );
    expect(migration).not.toContain("auth.role()");
    expect(migration).toContain("security definer");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("status = 'queued'");
    expect(migration).toContain("attempt_count < max_attempts");
    expect(migration).toContain("status = 'running'");
    expect(migration).toContain("locked_by = p_worker_id");
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain(
      "grant execute on function public.claim_next_processing_job(text, integer) to service_role",
    );
  });
});
