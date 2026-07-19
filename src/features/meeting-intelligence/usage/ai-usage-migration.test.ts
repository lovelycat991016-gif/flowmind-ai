import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607210003_add_ai_usage_events.sql",
);

function readMigration() {
  return existsSync(migrationPath)
    ? readFileSync(migrationPath, "utf8").toLowerCase()
    : "";
}

describe("AI usage events migration", () => {
  it("defines an owner-linked meeting intelligence operation ledger", () => {
    const migration = readMigration();

    expect(migration).toContain("create table public.ai_usage_events");
    for (const column of [
      "id uuid primary key",
      "meeting_intelligence_id uuid not null",
      "user_id uuid not null",
      "operation_type text not null",
      "attempt_number integer not null",
      "provider text",
      "model_identifier text",
      "input_tokens integer",
      "output_tokens integer",
      "estimated_cost_microunits bigint",
      "outcome text not null",
      "failure_code text",
      "created_at timestamptz not null",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain(
      "references public.meeting_intelligence (id) on delete cascade",
    );
    expect(migration).toContain("references auth.users (id) on delete cascade");
  });

  it("enforces safe attempt metadata and idempotency", () => {
    const migration = readMigration();

    expect(migration).toContain("attempt_number between 1 and 10");
    expect(migration).toContain(
      "operation_type = 'meeting_intelligence_generation'",
    );
    expect(migration).toContain("input_tokens is null or input_tokens >= 0");
    expect(migration).toContain("output_tokens is null or output_tokens >= 0");
    expect(migration).toContain(
      "estimated_cost_microunits is null or estimated_cost_microunits >= 0",
    );
    expect(migration).toContain(
      "create unique index ai_usage_events_intelligence_attempt_idx",
    );
    expect(migration).toContain(
      "on public.ai_usage_events (meeting_intelligence_id, attempt_number)",
    );
  });

  it("allows owners to read their usage events without client mutations", () => {
    const migration = readMigration();

    expect(migration).toContain(
      "alter table public.ai_usage_events enable row level security",
    );
    expect(migration).toContain(
      "on public.ai_usage_events for select to authenticated",
    );
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain(
      "grant select on table public.ai_usage_events to authenticated",
    );
    expect(migration).toContain(
      "revoke all on table public.ai_usage_events from anon",
    );
    expect(migration).not.toContain(
      "on public.ai_usage_events for insert to authenticated",
    );
  });
});
