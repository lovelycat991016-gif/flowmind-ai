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
