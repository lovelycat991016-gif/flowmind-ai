import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607270002_add_action_items.sql",
);

describe("action items migration", () => {
  it("defines task fields, statuses, source linkage, and indexes", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("create type public.action_item_priority");
    expect(sql).toContain("create type public.action_item_status");
    expect(sql).toContain("create table public.action_items");
    for (const column of [
      "meeting_id uuid not null",
      "user_id uuid not null",
      "title text not null",
      "description text",
      "owner text",
      "priority public.action_item_priority not null",
      "status public.action_item_status not null",
      "due_date date",
      "created_at timestamptz not null",
      "updated_at timestamptz not null",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("source_intelligence_id uuid");
    expect(sql).toContain(
      "create unique index action_items_intelligence_source_idx",
    );
    expect(sql).toContain("create trigger action_items_set_updated_at");
  });

  it("applies owner-scoped RLS and denies anonymous task access", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain(
      "alter table public.action_items enable row level security",
    );
    expect(sql.match(/create policy/g)).toHaveLength(4);
    expect(sql).toContain("meetings.user_id = (select auth.uid())");
    expect(sql).toContain(
      "grant select, insert, update, delete on table public.action_items to authenticated",
    );
    expect(sql).toContain("revoke all on table public.action_items from anon");
  });
});
