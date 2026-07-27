import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync("supabase/migrations/202607280004_create_knowledge_job_after_transcription.sql", "utf8").toLowerCase();
describe("knowledge job creation after transcription", () => {
  it("creates one queued job per completed transcript", () => {
    expect(sql).toContain("create or replace function public.complete_transcription_job");
    expect(sql).toContain("insert into public.meeting_knowledge_jobs");
    expect(sql).toContain("on conflict (transcript_id) do nothing");
  });
});
