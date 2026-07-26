import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202607260001_complete_transcription_with_intelligence.sql",
);

describe("automatic transcription intelligence migration", () => {
  it("atomically schedules a transcript-backed intelligence job after transcript persistence", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain(
      "create or replace function public.complete_transcription_job",
    );
    expect(migration).toContain("insert into public.transcripts");
    expect(migration).toContain("insert into public.meeting_intelligence");
    expect(migration).toContain("transcript_id");
    expect(migration).toContain("'queued'");
    expect(migration).toContain("on conflict (meeting_id)");
  });

  it("retains the service-role-only RPC boundary", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("auth.role()), '') <> 'service_role'");
    expect(migration).toContain(
      "revoke all on function public.complete_transcription_job",
    );
    expect(migration).toContain(
      "grant execute on function public.complete_transcription_job",
    );
  });
});
