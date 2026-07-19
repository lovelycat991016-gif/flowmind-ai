import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607200001_add_transcription_processing.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("transcription migration", () => {
  it("defines one durable owner-scoped transcript for each recording", () => {
    const migration = readMigration();

    expect(migration).toContain("create table public.transcripts");
    for (const column of [
      "id uuid primary key",
      "recording_id uuid not null unique",
      "user_id uuid not null",
      "provider text not null default 'openai'",
      "provider_model text not null",
      "language text",
      "content text not null",
      "completed_at timestamptz not null",
      "created_at timestamptz not null",
      "updated_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("on delete cascade");
    expect(migration).toContain("provider = 'openai'");
    expect(migration).toContain("char_length(content) between 1 and 1000000");
    expect(migration).toContain("create trigger transcripts_set_updated_at");
    expect(migration).toContain("create index transcripts_owner_completed_idx");
  });

  it("defines ordered timestamped transcript segments", () => {
    const migration = readMigration();

    expect(migration).toContain("create table public.transcript_segments");
    for (const column of [
      "id uuid primary key",
      "transcript_id uuid not null",
      "segment_index integer not null",
      "start_ms integer not null",
      "end_ms integer not null",
      "content text not null",
      "created_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("unique (transcript_id, segment_index)");
    expect(migration).toContain("segment_index >= 0");
    expect(migration).toContain("start_ms >= 0");
    expect(migration).toContain("end_ms >= start_ms");
    expect(migration).toContain(
      "create index transcript_segments_transcript_idx",
    );
  });

  it("enforces owner-only reads without opening transcript writes to users", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "alter table public.transcripts enable row level security",
    );
    expect(migration).toContain(
      "alter table public.transcript_segments enable row level security",
    );
    expect(migration).toContain(
      "on public.transcripts for select to authenticated",
    );
    expect(migration).toContain(
      "on public.transcript_segments for select to authenticated",
    );
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toMatch(
      /exists\s*\(\s*select 1 from public\.transcripts/,
    );
    expect(migration).toContain("transcripts.user_id = (select auth.uid())");
    expect(migration).toContain(
      "grant select on table public.transcripts to authenticated",
    );
    expect(migration).toContain(
      "grant select on table public.transcript_segments to authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.transcripts from anon",
    );
    expect(migration).toContain(
      "revoke all on table public.transcript_segments from anon",
    );
  });

  it("does not extend processing jobs during the transcript-only contract task", () => {
    const migration = readMigration();

    expect(migration).not.toContain("alter table public.processing_jobs");
  });
});
