import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607270001_add_meeting_ai_messages.sql",
);

function migration() {
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("meeting AI messages migration", () => {
  it("defines the message contract and owner-scoped indexes", () => {
    const sql = migration();

    expect(sql).toContain("create type public.meeting_ai_message_role");
    expect(sql).toContain("'user'");
    expect(sql).toContain("'assistant'");
    expect(sql).toContain("create table public.meeting_ai_messages");
    expect(sql).toContain("meeting_id uuid not null");
    expect(sql).toContain("user_id uuid not null");
    expect(sql).toContain("content text not null");
    expect(sql).toContain("char_length(content) between 1 and 4000");
    expect(sql).toContain(
      "create index meeting_ai_messages_owner_meeting_created_idx",
    );
    expect(sql).toContain("create trigger meeting_ai_messages_set_updated_at");
  });

  it("allows only meeting owners to read and insert messages", () => {
    const sql = migration();

    expect(sql).toContain(
      "alter table public.meeting_ai_messages enable row level security",
    );
    expect(sql).toContain("for select to authenticated");
    expect(sql).toContain("for insert to authenticated");
    expect(sql).toContain("meetings.user_id = (select auth.uid())");
    expect(sql).toContain(
      "grant select, insert on table public.meeting_ai_messages to authenticated",
    );
    expect(sql).toContain(
      "revoke all on table public.meeting_ai_messages from anon",
    );
  });
});
