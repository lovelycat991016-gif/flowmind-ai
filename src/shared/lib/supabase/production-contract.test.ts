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
      "202607210003_add_ai_usage_events.sql",
      "202607250001_repair_meeting_intelligence_worker.sql",
      "202607250002_restrict_meeting_intelligence_claim_rpc.sql",
      "202607250003_add_manual_intelligence_input.sql",
      "202607260001_complete_transcription_with_intelligence.sql",
      "202607270001_add_meeting_ai_messages.sql",
      "202607270002_add_action_items.sql",
      "202607280001_extend_ai_usage_events.sql",
      "202607280002_create_meeting_knowledge_base.sql",
      "202607280003_add_meeting_knowledge_job_leases.sql",
      "202607280004_create_knowledge_job_after_transcription.sql",
      "202607280005_add_vector_retrieval_rpc.sql",
      "202608120001_add_worker_lease_recovery_and_fencing.sql",
      "202608170001_fix_claim_next_processing_job_role_check.sql",
      "202608170002_fix_claim_next_processing_job_security_definer.sql",
      "202608190001_fix_claim_next_processing_job_ambiguous_columns.sql",
      "202608210001_allow_aliyun_transcript_provider.sql",
      "202608270001_allow_audio_format_failure_codes.sql",
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
      migration("202607250002_restrict_meeting_intelligence_claim_rpc.sql"),
    ).toContain(
      "grant execute on function public.claim_next_meeting_intelligence(text, integer) to service_role",
    );
    expect(
      migration("202607260001_complete_transcription_with_intelligence.sql"),
    ).toContain("insert into public.meeting_intelligence");
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
