import { beforeEach, describe, expect, it, vi } from "vitest";

const { createWorkerServiceRoleClient } = vi.hoisted(() => ({
  createWorkerServiceRoleClient: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/service-role", () => ({
  createWorkerServiceRoleClient,
}));

import { claimNextProcessingJob } from "./claim-processing-job";

const workerId = "transcription-cron:550e8400-e29b-41d4-a716-446655440000";
const jobRow = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recording_id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  user_id: "4050a593-2e4a-4d28-ae62-6eeac8ea9065",
  attempt_count: 1,
  max_attempts: 3,
  locked_at: "2026-07-20T08:00:00.000Z",
  locked_by: workerId,
  lease_expires_at: "2026-07-20T08:05:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("claimNextProcessingJob", () => {
  it("claims and maps one queued job through the service-role RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: jobRow, error: null });
    createWorkerServiceRoleClient.mockReturnValue({ rpc });

    await expect(
      claimNextProcessingJob({ workerId, leaseSeconds: 300 }),
    ).resolves.toEqual({
      id: jobRow.id,
      recordingId: jobRow.recording_id,
      userId: jobRow.user_id,
      attemptCount: 1,
      maxAttempts: 3,
      lockedAt: jobRow.locked_at,
      lockedBy: workerId,
      leaseExpiresAt: jobRow.lease_expires_at,
    });
    expect(rpc).toHaveBeenCalledWith("claim_next_processing_job", {
      p_lease_seconds: 300,
      p_worker_id: workerId,
    });
  });

  it("returns null when no queued job is available", async () => {
    createWorkerServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(
      claimNextProcessingJob({ workerId, leaseSeconds: 300 }),
    ).resolves.toBeNull();
  });

  it("returns a safe error when the claim RPC fails", async () => {
    createWorkerServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "service-role database detail" },
      }),
    });

    await expect(
      claimNextProcessingJob({ workerId, leaseSeconds: 300 }),
    ).rejects.toThrow("Unable to claim processing job.");
  });

  it("rejects invalid worker claim input before creating a service-role client", async () => {
    await expect(
      claimNextProcessingJob({ workerId: "", leaseSeconds: 0 }),
    ).rejects.toThrow("Unable to claim processing job.");
    expect(createWorkerServiceRoleClient).not.toHaveBeenCalled();
  });
});
