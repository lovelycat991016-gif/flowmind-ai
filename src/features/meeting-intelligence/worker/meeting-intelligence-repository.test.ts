import { describe, expect, it, vi } from "vitest";

const { createWorkerServiceRoleClient } = vi.hoisted(() => ({
  createWorkerServiceRoleClient: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/service-role", () => ({
  createWorkerServiceRoleClient,
}));

import { createMeetingIntelligenceWorkerRepository } from "./meeting-intelligence-repository";

const job = {
  id: "job-id",
  meetingId: "meeting-id",
  transcriptId: "transcript-id",
  userId: "user-id",
  lockedBy: "meeting-intelligence-cron:550e8400-e29b-41d4-a716-446655440000",
};

const result = {
  provider: "mock",
  modelIdentifier: "mock-model",
  promptVersion: "meeting_intelligence/v2",
  summary: { content: "summary" },
  keyPoints: [],
  actionItems: [],
  decisions: [],
  risks: [],
  outputMetadata: {},
};

function chain(data: unknown) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return query;
}

describe("meeting intelligence worker repository", () => {
  it("maps one claimed job from the RPC result set", async () => {
    const row = {
      id: job.id,
      meeting_id: job.meetingId,
      transcript_id: job.transcriptId,
      user_id: job.userId,
      locked_by: job.lockedBy,
    };
    const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });
    createWorkerServiceRoleClient.mockReturnValue({ rpc });

    await expect(
      createMeetingIntelligenceWorkerRepository().claim(job.lockedBy, 300),
    ).resolves.toEqual(job);
    expect(rpc).toHaveBeenCalledWith("claim_next_meeting_intelligence", {
      p_worker_id: job.lockedBy,
      p_lease_seconds: 300,
    });
  });

  it("returns null when the claim RPC result set is empty", async () => {
    createWorkerServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await expect(
      createMeetingIntelligenceWorkerRepository().claim(job.lockedBy, 300),
    ).resolves.toBeNull();
  });

  it("rejects a claim RPC result set containing more than one job", async () => {
    const row = {
      id: job.id,
      meeting_id: job.meetingId,
      transcript_id: job.transcriptId,
      user_id: job.userId,
      locked_by: job.lockedBy,
    };
    createWorkerServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [row, row], error: null }),
    });

    await expect(
      createMeetingIntelligenceWorkerRepository().claim(job.lockedBy, 300),
    ).rejects.toThrow("Unable to claim meeting intelligence.");
  });

  it("fences completion with the current invocation token and an unexpired lease", async () => {
    const query = chain({ id: job.id });
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });

    await createMeetingIntelligenceWorkerRepository().complete(job, result);

    expect(query.eq).toHaveBeenCalledWith("locked_by", job.lockedBy);
    expect(query.gt).toHaveBeenCalledWith(
      "lease_expires_at",
      expect.any(String),
    );
  });

  it("fences failure with the current invocation token and an unexpired lease", async () => {
    const query = chain({ id: job.id });
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });

    await createMeetingIntelligenceWorkerRepository().fail(
      job,
      "provider_timeout",
    );

    expect(query.eq).toHaveBeenCalledWith("locked_by", job.lockedBy);
    expect(query.gt).toHaveBeenCalledWith(
      "lease_expires_at",
      expect.any(String),
    );
  });
});
