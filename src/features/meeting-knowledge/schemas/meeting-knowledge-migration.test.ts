import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607280002_create_meeting_knowledge_base.sql",
);

function migration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("meeting knowledge base migration", () => {
  it("creates owner-linked jobs and vector document chunks", () => {
    const sql = migration();
    expect(sql).toContain("create extension if not exists vector");
    expect(sql).toContain("create table public.meeting_knowledge_jobs");
    expect(sql).toContain("transcript_id uuid not null");
    expect(sql).toContain("attempt_count integer not null default 0");
    expect(sql).toContain("status public.meeting_knowledge_job_status not null default 'queued'");
    expect(sql).toContain("create table public.meeting_document_chunks");
    expect(sql).toContain("embedding vector(1536)");
    expect(sql).toContain("metadata jsonb not null default '{}'::jsonb");
    expect(sql).toContain("unique (transcript_id, chunk_index)");
  });

  it("enables owner RLS for both jobs and chunks", () => {
    const sql = migration();
    for (const table of ["meeting_knowledge_jobs", "meeting_document_chunks"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`on public.${table} for select to authenticated`);
    }
    expect(sql).toContain("(select auth.uid()) = user_id");
    expect(sql).toContain("meetings.user_id = (select auth.uid())");
    expect(sql).toContain("revoke all on table public.meeting_document_chunks from anon");
  });
});
