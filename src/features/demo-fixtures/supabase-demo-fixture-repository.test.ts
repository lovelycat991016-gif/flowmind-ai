import { describe, expect, it } from "vitest";

import { demoFixtureManifest } from "./demo-fixture-manifest";
import { createSupabaseDemoFixtureRepository } from "./supabase-demo-fixture-repository";

function createClient() {
  const operations: Array<{ table: string; action: string; payload?: unknown; filters: unknown[] }> = [];
  const from = (table: string) => {
    const filters: unknown[] = [];
    const query = {
      upsert(payload: unknown) { operations.push({ table, action: "upsert", payload, filters }); return query; },
      delete() { operations.push({ table, action: "delete", filters }); return query; },
      select() { operations.push({ table, action: "select", filters }); return query; },
      eq(key: string, value: string) { filters.push([key, value]); return query; },
      in(key: string, value: string[]) { filters.push([key, value]); return query; },
      then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
        return Promise.resolve({ data: table === "meetings" ? demoFixtureManifest.meetings.map((meeting) => ({ id: meeting.id, user_id: "demo-user" })) : demoFixtureManifest.meetings.map((meeting) => ({ meeting_id: meeting.id, user_id: "demo-user" })), error: null }).then(onfulfilled, onrejected);
      },
    };
    return query;
  };
  return { operations, from, auth: { admin: { listUsers: async () => ({ data: { users: [{ id: "demo-user", email: demoFixtureManifest.user.email }] }, error: null }), createUser: async () => ({ data: { user: { id: "demo-user", email: demoFixtureManifest.user.email } }, error: null }) } } };
}

describe("Supabase demo fixture repository", () => {
  it("upserts the complete fixture graph with the dedicated demo owner", async () => {
    const client = createClient();
    const repository = createSupabaseDemoFixtureRepository(client);

    await repository.upsertFixture({ userId: "demo-user", fixture: demoFixtureManifest });

    expect(client.operations.map((operation) => operation.table)).toEqual([
      "meetings", "recordings", "transcripts", "transcript_segments", "meeting_intelligence", "action_items", "meeting_document_chunks",
    ]);
    const meetingWrite = client.operations[0].payload as Array<{ id: string; user_id: string }>;
    expect(meetingWrite).toContainEqual(expect.objectContaining({ id: demoFixtureManifest.meetings[0].id, user_id: "demo-user" }));
  });

  it("resets only rows owned by the dedicated demo user", async () => {
    const client = createClient();
    await createSupabaseDemoFixtureRepository(client).resetFixture("demo-user");

    expect(client.operations).toEqual([{ table: "meetings", action: "delete", filters: [["user_id", "demo-user"]] }]);
  });

  it("verifies expected rows remain owner scoped", async () => {
    const client = createClient();
    await expect(createSupabaseDemoFixtureRepository(client).verifyFixture({ userId: "demo-user", fixture: demoFixtureManifest })).resolves.toEqual({ hasExpectedMeetings: true, hasExpectedRagSources: true, isOwnerScoped: true });
  });
});
