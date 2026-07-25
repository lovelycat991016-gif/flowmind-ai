import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202607250002_restrict_meeting_intelligence_claim_rpc.sql",
);

const read = () => readFileSync(migrationPath, "utf8").toLowerCase();

describe("meeting intelligence claim RPC privilege migration", () => {
  it("removes client-role execution and grants the worker role only", () => {
    const sql = read();

    expect(sql).toContain(
      "revoke execute on function public.claim_next_meeting_intelligence(text, integer) from anon, authenticated",
    );
    expect(sql).toContain(
      "revoke execute on function public.claim_next_meeting_intelligence(text, integer) from public",
    );
    expect(sql).toContain(
      "grant execute on function public.claim_next_meeting_intelligence(text, integer) to service_role",
    );
  });
});
