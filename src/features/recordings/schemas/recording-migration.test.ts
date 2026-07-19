import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607190001_create_recordings.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("recordings migration", () => {
  it("defines recording metadata and the 500 MB upload contract", () => {
    const migration = readMigration();

    expect(migration).toContain("create table public.recordings");
    for (const column of [
      "id uuid primary key",
      "meeting_id uuid not null",
      "user_id uuid not null",
      "storage_bucket text not null",
      "storage_path text unique not null",
      "original_filename text not null",
      "mime_type text not null",
      "file_size_bytes bigint not null",
      "status public.recording_upload_status not null",
      "uploaded_at timestamptz",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain("file_size_bytes between 1 and 524288000");
    expect(migration).toContain("audio/mpeg");
    expect(migration).toContain("audio/mp4");
    expect(migration).toContain("audio/wav");
    expect(migration).toContain("audio/webm");
  });

  it("allows historical failures while enforcing one active recording", () => {
    const migration = readMigration();

    expect(migration).toContain("create unique index recordings_active_meeting_idx");
    expect(migration).toContain("on public.recordings (meeting_id)");
    expect(migration).toContain(
      "where status in ('pending', 'uploading', 'uploaded')",
    );
    expect(migration).toContain("storage_path text unique not null");
  });

  it("configures private owner-only table and object access", () => {
    const migration = readMigration();

    expect(migration).toContain("enable row level security");
    expect(migration).toContain("create policy");
    expect(migration).toMatch(/exists\s*\(\s*select 1 from public\.meetings/);
    expect(migration).toContain("insert into storage.buckets");
    expect(migration).toContain("file_size_limit");
    expect(migration).toContain("524288000");
    expect(migration).toContain("storage.objects");
    expect(migration).toContain("bucket_id = 'recordings'");
    expect(migration).toContain("split_part(name, '/', 1) = (select auth.uid())::text");
    expect(migration).toContain("create trigger recordings_set_updated_at");
  });
});
