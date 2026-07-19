import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607210001_add_meeting_intelligence.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("meeting intelligence migration", () => {
  it("defines a durable generation lifecycle and output metadata contract", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "create type public.meeting_intelligence_status as enum",
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
    expect(migration).toContain("create table public.meeting_intelligence");
    for (const column of [
      "id uuid primary key",
      "meeting_id uuid not null",
      "transcript_id uuid not null",
      "user_id uuid not null",
      "status public.meeting_intelligence_status not null default 'queued'",
      "model_identifier text",
      "prompt_version text not null",
      "output_metadata jsonb not null default '{}'::jsonb",
      "created_at timestamptz not null",
      "updated_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
  });

  it("constrains owner-linked data and one active intelligence result per meeting", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "references public.meetings (id) on delete cascade",
    );
    expect(migration).toContain(
      "references public.transcripts (id) on delete cascade",
    );
    expect(migration).toContain("references auth.users (id) on delete cascade");
    expect(migration).toContain("jsonb_typeof(output_metadata) = 'object'");
    expect(migration).toContain(
      "create unique index meeting_intelligence_active_meeting_idx",
    );
    expect(migration).toContain("on public.meeting_intelligence (meeting_id)");
    expect(migration).toContain(
      "where status in ('queued', 'running', 'completed')",
    );
    expect(migration).toContain(
      "create trigger meeting_intelligence_set_updated_at",
    );
  });

  it("enforces owner-only reads through the meeting relationship", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "alter table public.meeting_intelligence enable row level security",
    );
    expect(migration).toContain(
      "on public.meeting_intelligence for select to authenticated",
    );
    expect(migration).toMatch(/exists\s*\(\s*select 1 from public\.meetings/);
    expect(migration).toContain("meetings.user_id = (select auth.uid())");
    expect(migration).toContain(
      "grant select on table public.meeting_intelligence to authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.meeting_intelligence from anon",
    );
    expect(migration).not.toContain("alter table public.processing_jobs");
  });
});
