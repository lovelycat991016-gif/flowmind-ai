import { beforeEach, describe, expect, it, vi } from "vitest";

const { createWorkerServiceRoleClient } = vi.hoisted(() => ({
  createWorkerServiceRoleClient: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/service-role", () => ({
  createWorkerServiceRoleClient,
}));

import {
  completeTranscriptionJob,
  failTranscriptionJob,
} from "./transcription-job-persistence";

const job = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recordingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  userId: "4050a593-2e4a-4d28-ae62-6eeac8ea9065",
  attemptCount: 1,
  maxAttempts: 3,
  lockedAt: "2026-07-20T08:00:00.000Z",
  lockedBy: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  leaseExpiresAt: "2026-07-20T08:05:00.000Z",
};

const result = {
  provider: "openai",
  providerModel: "whisper-1",
  language: "zh",
  content: "本周项目进展顺利。",
  segments: [
    {
      segmentIndex: 0,
      startMs: 0,
      endMs: 1200,
      content: "本周项目进展顺利。",
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("transcription job persistence", () => {
  it("persists a transcript and segments through the lease-protected completion RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createWorkerServiceRoleClient.mockReturnValue({ rpc });

    await expect(
      completeTranscriptionJob({ job, workerId: job.lockedBy, result }),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("complete_transcription_job", {
      p_content: result.content,
      p_language: result.language,
      p_provider: result.provider,
      p_provider_model: result.providerModel,
      p_recording_id: job.recordingId,
      p_segments: [
        {
          content: result.segments[0].content,
          end_ms: result.segments[0].endMs,
          segment_index: result.segments[0].segmentIndex,
          start_ms: result.segments[0].startMs,
        },
      ],
      p_user_id: job.userId,
      p_worker_id: job.lockedBy,
      p_job_id: job.id,
    });
  });

  it("rejects invalid completion input before creating a service-role client", async () => {
    await expect(
      completeTranscriptionJob({
        job,
        workerId: "not-a-worker-id",
        result,
      }),
    ).rejects.toThrow("Unable to complete transcription job.");
    expect(createWorkerServiceRoleClient).not.toHaveBeenCalled();
  });

  it("records a safe failure code through the lease-protected failure RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    createWorkerServiceRoleClient.mockReturnValue({ rpc });

    await expect(
      failTranscriptionJob({
        job,
        workerId: job.lockedBy,
        code: "provider_rate_limited",
      }),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("fail_transcription_job", {
      p_failure_code: "provider_rate_limited",
      p_job_id: job.id,
      p_worker_id: job.lockedBy,
    });
  });

  it("does not expose service-role persistence failures", async () => {
    createWorkerServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "unsafe database detail" },
      }),
    });

    await expect(
      failTranscriptionJob({
        job,
        workerId: job.lockedBy,
        code: "provider_unavailable",
      }),
    ).rejects.toThrow("Unable to fail transcription job.");
  });
});
