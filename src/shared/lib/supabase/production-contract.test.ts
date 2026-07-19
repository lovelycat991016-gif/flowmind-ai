import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = path.resolve("supabase/migrations");
const qaPath = path.resolve("docs/qa/sprint-8-production-hardening-qa.md");
const runbookPath = path.resolve("docs/beta/private-beta-runbook.md");

function migration(name: string) {
  return readFileSync(
    path.join(migrationsDirectory, name),
    "utf8",
  ).toLowerCase();
}

describe("Supabase production contract", () => {
  it("keeps required migrations in the release order", () => {
    expect(readdirSync(migrationsDirectory).sort()).toEqual([
      "202607140001_create_profiles.sql",
      "202607160001_create_meetings.sql",
      "202607190001_create_recordings.sql",
      "202607190002_create_processing_jobs.sql",
      "202607200001_add_transcription_processing.sql",
      "202607200002_add_processing_job_leases.sql",
      "202607200003_add_transcription_execution.sql",
      "202607210001_add_meeting_intelligence.sql",
      "202607210002_add_meeting_intelligence_worker.sql",
    ]);
  });

  it("requires owner RLS, private recording objects, and service-role RPC grants", () => {
    expect(migration("202607160001_create_meetings.sql")).toContain(
      "alter table public.meetings enable row level security",
    );
    expect(migration("202607190001_create_recordings.sql")).toContain(
      "split_part(name, '/', 1) = (select auth.uid())::text",
    );
    expect(migration("202607200003_add_transcription_execution.sql")).toContain(
      "grant execute on function public.complete_transcription_job",
    );
    expect(
      migration("202607210002_add_meeting_intelligence_worker.sql"),
    ).toContain(
      "grant execute on function public.claim_next_meeting_intelligence(text, integer) to service_role",
    );
  });

  it("provides a production QA checklist and private beta runbook", () => {
    expect(existsSync(qaPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);

    const qa = readFileSync(qaPath, "utf8");
    const runbook = readFileSync(runbookPath, "utf8");

    expect(qa).toContain("Migration Verification");
    expect(qa).toContain("RLS Owner Isolation");
    expect(qa).toContain("Storage Privacy");
    expect(qa).toContain("Service-Role Separation");
    expect(runbook).toContain("Rollback");
    expect(runbook).toContain("Incident");
  });
});
