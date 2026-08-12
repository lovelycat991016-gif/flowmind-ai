import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type JobContract = {
  name: string;
  claimMigration: string;
  runningStatus: string;
  terminalSource: string;
};

const contracts: JobContract[] = [
  {
    name: "processing jobs",
    claimMigration: "202608120001_add_worker_lease_recovery_and_fencing.sql",
    runningStatus: "running",
    terminalSource:
      "supabase/migrations/202607260001_complete_transcription_with_intelligence.sql",
  },
  {
    name: "meeting intelligence",
    claimMigration: "202608120001_add_worker_lease_recovery_and_fencing.sql",
    runningStatus: "running",
    terminalSource: "src/features/meeting-intelligence/worker/meeting-intelligence-repository.ts",
  },
];

function readMigration(fileName: string) {
  return readFileSync(
    path.resolve("supabase/migrations", fileName),
    "utf8",
  ).toLowerCase();
}

function compact(value: string) {
  return value.replace(/\s+/g, " ");
}

describe("worker lease recovery and invocation fencing migration contract", () => {
  for (const contract of contracts) {
    describe(contract.name, () => {
      it("keeps queued claims atomic and records the current invocation token", () => {
        const sql = readMigration(contract.claimMigration);

        expect(sql).toContain("for update skip locked");
        expect(sql).toContain("status = 'queued'");
        expect(sql).toContain("locked_by = p_worker_id");
        expect(sql).toContain("lease_expires_at");
        expect(sql).toContain("attempt_count");
      });

      it("atomically reclaims an expired running lease for a new invocation token", () => {
        const sql = readMigration(contract.claimMigration);

        expect(compact(sql)).toContain(
          `status = 'queued' or (status = '${contract.runningStatus}' and lease_expires_at < timezone('utc', now()))`,
        );
        expect(sql).toContain("attempt_count < max_attempts");
        expect(sql).toContain("locked_by = p_worker_id");
        expect(sql).toContain(
          "lease_expires_at = timezone('utc', now()) + make_interval(secs => p_lease_seconds)",
        );
      });

      it("does not reclaim a non-expired running lease", () => {
        const sql = readMigration(contract.claimMigration);

        expect(sql).toContain(
          `status = '${contract.runningStatus}' and lease_expires_at < timezone('utc', now())`,
        );
        expect(sql).not.toContain(
          `status = '${contract.runningStatus}' or lease_expires_at`,
        );
      });

      it("fences stale invocations from terminal writes after a reclaim", () => {
        const sql = readMigration(contract.claimMigration);
        const terminalSource = readFileSync(
          path.resolve(contract.terminalSource),
          "utf8",
        ).toLowerCase();

        expect(sql).toContain("locked_by = p_worker_id");
        if (contract.name === "processing jobs") {
          expect(terminalSource).toContain(
            "lease_expires_at > timezone('utc', now())",
          );
          expect(terminalSource).toContain("locked_by = p_worker_id");
        } else {
          expect(terminalSource).toContain(".eq(\"locked_by\", job.lockedby)");
          expect(terminalSource).toContain(".gt(\"lease_expires_at\"");
        }
      });

      it("fails an expired lease after its final attempt and clears its lock", () => {
        const sql = readMigration(contract.claimMigration);

        expect(sql).toContain("attempt_count >= max_attempts");
        expect(sql).toContain("status = 'failed'");
        expect(sql).toContain("last_error_code = 'lease_expired'");
        expect(sql).toContain("locked_by = null");
        expect(sql).toContain("lease_expires_at = null");
      });

      it("keeps recovery service-role-only without changing owner-facing RLS", () => {
        const sql = readMigration(contract.claimMigration);

        expect(sql).toContain("auth.role()");
        expect(sql).toContain("'service_role'");
        expect(sql).not.toContain("disable row level security");
      });
    });
  }
});
