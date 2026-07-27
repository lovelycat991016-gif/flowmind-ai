import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/202607280001_extend_ai_usage_events.sql";

describe("AI usage events extension migration", () => {
  it("keeps owner-scoped RLS while supporting Copilot events and latency", async () => {
    const migration = await readFile(migrationPath, "utf8");
    expect(migration).toContain("add column meeting_id uuid");
    expect(migration).toContain("add column latency_ms integer");
    expect(migration).toContain("meeting_copilot_response");
    expect(migration).toContain("Users can view their own AI usage events");
    expect(migration).toContain("meetings.user_id = (select auth.uid())");
  });
});
