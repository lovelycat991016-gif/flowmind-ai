import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607160001_create_meetings.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("meetings migration", () => {
  it("defines the minimal meetings schema and validation constraints", () => {
    const migration = readMigration();

    expect(migration).toContain("create table public.meetings");
    for (const column of [
      "id uuid primary key",
      "user_id uuid not null",
      "title text not null",
      "meeting_date timestamptz not null",
      "duration_seconds integer",
      "participant_count integer",
      "processing_status text",
      "archived_at timestamptz",
      "created_at timestamptz not null",
      "updated_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("title = btrim(title)");
    expect(migration).toContain("char_length(title) between 1 and 200");
    expect(migration).toContain("duration_seconds >= 0");
    expect(migration).toContain("participant_count >= 0");
  });

  it("configures owner-only access and table privileges", () => {
    const migration = readMigration();

    expect(migration).toContain("enable row level security");
    expect(migration.match(/create policy/g)).toHaveLength(4);
    expect(migration).toContain("for select to authenticated");
    expect(migration).toContain("for insert to authenticated");
    expect(migration).toContain("for update to authenticated");
    expect(migration).toContain("for delete to authenticated");
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.meetings to authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.meetings from anon",
    );
  });

  it("adds query indexes and automatic updated_at maintenance", () => {
    const migration = readMigration();

    expect(migration).toContain("create extension if not exists pg_trgm");
    expect(
      migration.match(/create index meetings_/g)?.length,
    ).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("where archived_at is null");
    expect(migration).toContain("where archived_at is not null");
    expect(migration).toContain("using gin (title extensions.gin_trgm_ops)");
    expect(migration).toContain("create trigger meetings_set_updated_at");
    expect(migration).toContain("before update on public.meetings");
    expect(migration).toContain("execute procedure public.set_updated_at()");
  });
});
