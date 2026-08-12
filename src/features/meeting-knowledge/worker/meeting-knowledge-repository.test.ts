import { describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/shared/lib/supabase/service-role", () => ({ createWorkerServiceRoleClient: () => client }));
import { createMeetingKnowledgeRepository } from "./meeting-knowledge-repository";

function query(result: { data?: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), gt: vi.fn(), order: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [builder.select, builder.insert, builder.update, builder.eq, builder.gt, builder.order, builder.single, builder.maybeSingle]) method.mockReturnValue(builder);
  return builder;
}

describe("meeting knowledge repository", () => {
  it("claims a queued or expired-lease job through the atomic RPC", async () => {
    client.rpc.mockResolvedValue({ data: { id: "j", meeting_id: "m", user_id: "u", transcript_id: "t", locked_by: "w" }, error: null });
    await expect(createMeetingKnowledgeRepository().claim("w", 60)).resolves.toMatchObject({ id: "j", lockedBy: "w" });
    expect(client.rpc).toHaveBeenCalledWith("claim_next_meeting_knowledge_job", { p_worker_id: "w", p_lease_seconds: 60 });
  });

  it("uses lease-owner and unexpired-lease filters when completing or failing a job", async () => {
    const completionQuery = query({ error: { message: "no row" } });
    client.from.mockReturnValue(completionQuery);
    const repository = createMeetingKnowledgeRepository();
    const job = { id: "j", meetingId: "m", userId: "u", transcriptId: "t", lockedBy: "worker-a" };
    await expect(repository.complete(job)).rejects.toThrow("Unable to complete");
    expect(completionQuery.eq).toHaveBeenCalledWith("locked_by", "worker-a");
    expect(completionQuery.gt).toHaveBeenCalledWith("lease_expires_at", expect.any(String));
  });

  it("persists embeddings with transcript, owner, and chunk-index filters", async () => {
    const persistenceQuery = query({ error: null });
    client.from.mockReturnValue(persistenceQuery);
    await createMeetingKnowledgeRepository().saveEmbeddings(
      { id: "j", meetingId: "m", userId: "owner", transcriptId: "t", lockedBy: "w" },
      [Array(1536).fill(0)],
    );
    expect(persistenceQuery.eq).toHaveBeenCalledWith("transcript_id", "t");
    expect(persistenceQuery.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(persistenceQuery.eq).toHaveBeenCalledWith("chunk_index", 0);
  });
});
