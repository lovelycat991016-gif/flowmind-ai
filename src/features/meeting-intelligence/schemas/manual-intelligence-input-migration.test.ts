import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607250003_add_manual_intelligence_input.sql",
);

const read = () => readFileSync(migrationPath, "utf8").toLowerCase();

describe("manual meeting intelligence input migration", () => {
  it("allows exactly one transcript or manual text source per intelligence job", () => {
    const sql = read();

    expect(sql).toContain("alter column transcript_id drop not null");
    expect(sql).toContain("add column input_text text");
    expect(sql).toContain("meeting_intelligence_input_source_valid");
    expect(sql).toContain("transcript_id is not null and input_text is null");
    expect(sql).toContain("transcript_id is null and input_text is not null");
  });

  it("permits owner-scoped inserts without weakening read isolation", () => {
    const sql = read();

    expect(sql).toContain(
      'create policy "users can create their own meeting intelligence"',
    );
    expect(sql).toContain("on public.meeting_intelligence for insert");
    expect(sql).toContain("meeting_intelligence.user_id = (select auth.uid())");
    expect(sql).toContain("meetings.user_id = (select auth.uid())");
    expect(sql).toContain(
      "grant insert on table public.meeting_intelligence to authenticated",
    );
  });
});
