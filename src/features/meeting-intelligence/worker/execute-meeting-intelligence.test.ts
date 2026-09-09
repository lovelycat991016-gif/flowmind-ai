import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createInvocationToken: vi.fn() }));

vi.mock("@/features/transcription/worker/create-invocation-token", () => ({
  createInvocationToken: mocks.createInvocationToken,
}));

import { executeNextMeetingIntelligence } from "./execute-meeting-intelligence";

const invocationToken =
  "meeting-intelligence-cron:550e8400-e29b-41d4-a716-446655440000";
const job = {
  id: "a",
  meetingId: "m",
  transcriptId: null,
  userId: "u",
  lockedBy: invocationToken,
};
const secondJob = { ...job, id: "b" };
const thirdJob = { ...job, id: "c" };
const fourthJob = { ...job, id: "d" };
const result = {
  provider: "p",
  modelIdentifier: "m",
  promptVersion: "meeting_intelligence/v2",
  summary: { content: "s" },
  actionItems: [],
  decisions: [],
  outputMetadata: {},
};

const setup = () => ({
  claim: vi.fn(),
  loadInput: vi
    .fn()
    .mockResolvedValue({ content: "manual text", language: "zh" }),
  complete: vi.fn(),
  fail: vi.fn(),
});

function queueJobs(
  dependencies: ReturnType<typeof setup>,
  ...jobs: (typeof job)[]
) {
  for (const queuedJob of jobs) {
    dependencies.claim.mockResolvedValueOnce(queuedJob);
  }
  dependencies.claim.mockResolvedValueOnce(null);
}

describe("executeNextMeetingIntelligence", () => {
  beforeEach(() => {
    mocks.createInvocationToken.mockReturnValue(invocationToken);
  });

  it("processes two claimed jobs before the queue becomes empty", async () => {
    const dependencies = setup();
    queueJobs(dependencies, job, secondJob);
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [
        { status: "completed", jobId: "a" },
        { status: "completed", jobId: "b" },
      ],
      stopReason: "queue_empty",
    });
    expect(dependencies.claim).toHaveBeenCalledTimes(3);
    expect(dependencies.claim).toHaveBeenNthCalledWith(1, invocationToken, 60);
    expect(dependencies.claim).toHaveBeenNthCalledWith(2, invocationToken, 60);
    expect(dependencies.claim).toHaveBeenNthCalledWith(3, invocationToken, 60);
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it("continues after a failed job is reliably persisted", async () => {
    const dependencies = setup();
    queueJobs(dependencies, job, secondJob);
    dependencies.loadInput
      .mockRejectedValueOnce({ code: "intelligence_input_invalid" })
      .mockResolvedValueOnce({ content: "manual text", language: "zh" });
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [
        {
          status: "failed",
          jobId: "a",
          code: "intelligence_input_invalid",
        },
        { status: "completed", jobId: "b" },
      ],
      stopReason: "queue_empty",
    });
    expect(dependencies.fail).toHaveBeenCalledWith(
      job,
      "intelligence_input_invalid",
    );
    expect(dependencies.complete).toHaveBeenCalledWith(secondJob, result);
  });

  it("processes at most three jobs per invocation", async () => {
    const dependencies = setup();
    dependencies.claim
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(secondJob)
      .mockResolvedValueOnce(thirdJob)
      .mockResolvedValueOnce(fourthJob);
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [
        { status: "completed", jobId: "a" },
        { status: "completed", jobId: "b" },
        { status: "completed", jobId: "c" },
      ],
      stopReason: "job_limit_reached",
    });
    expect(dependencies.claim).toHaveBeenCalledTimes(3);
    expect(dependencies.loadInput).not.toHaveBeenCalledWith(fourthJob);
  });

  it("does not claim another job without a full provider window and terminal reserve", async () => {
    let currentTimeMs = 0;
    const dependencies = setup();
    dependencies.claim.mockResolvedValueOnce(job);
    dependencies.complete.mockImplementation(async () => {
      currentTimeMs = 165_001;
    });
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
        now: () => currentTimeMs,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [{ status: "completed", jobId: "a" }],
      stopReason: "budget_exhausted",
    });
    expect(dependencies.claim).toHaveBeenCalledOnce();
  });

  it("does not claim when the initial safe execution budget is exhausted", async () => {
    const dependencies = setup();
    const provider = { generate: vi.fn() };
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(165_001);

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
        now,
      }),
    ).resolves.toEqual({
      status: "idle",
      stopReason: "budget_exhausted",
    });
    expect(dependencies.claim).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("rejects a later claim that is not fenced to this invocation", async () => {
    const dependencies = setup();
    dependencies.claim
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce({ ...secondJob, lockedBy: "another-worker" });
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).rejects.toThrow("Unable to execute meeting intelligence.");
    expect(dependencies.claim).toHaveBeenCalledTimes(2);
    expect(provider.generate).toHaveBeenCalledOnce();
  });

  it("stops after completion persistence fails", async () => {
    const dependencies = setup();
    dependencies.claim
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(secondJob);
    dependencies.complete.mockRejectedValueOnce(new Error("write failed"));
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).rejects.toThrow("Unable to execute meeting intelligence.");
    expect(dependencies.claim).toHaveBeenCalledOnce();
    expect(dependencies.fail).not.toHaveBeenCalled();
  });

  it("stops after failure persistence fails", async () => {
    const dependencies = setup();
    dependencies.claim
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(secondJob);
    dependencies.loadInput.mockRejectedValueOnce({
      code: "intelligence_input_invalid",
    });
    dependencies.fail.mockRejectedValueOnce(new Error("write failed"));
    const provider = { generate: vi.fn() };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).rejects.toThrow("Unable to execute meeting intelligence.");
    expect(dependencies.claim).toHaveBeenCalledOnce();
  });

  it("stops after a claim RPC failure", async () => {
    const dependencies = setup();
    dependencies.claim.mockRejectedValueOnce(new Error("claim failed"));
    const provider = { generate: vi.fn() };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).rejects.toThrow("Unable to execute meeting intelligence.");
    expect(dependencies.claim).toHaveBeenCalledOnce();
  });

  it("generates and persists one claimed manual-text result", async () => {
    const dependencies = setup();
    queueJobs(dependencies, job);
    const provider = { generate: vi.fn().mockResolvedValue(result) };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [{ status: "completed", jobId: "a" }],
      stopReason: "queue_empty",
    });
    expect(dependencies.loadInput).toHaveBeenCalledWith(job);
    expect(dependencies.complete).toHaveBeenCalledWith(job, result);
  });

  it("fails safely for missing input and provider failure", async () => {
    const dependencies = setup();
    queueJobs(dependencies, job);
    dependencies.loadInput.mockRejectedValue({
      code: "intelligence_input_invalid",
    });
    const provider = { generate: vi.fn() };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({
      status: "processed",
      jobs: [
        {
          status: "failed",
          jobId: "a",
          code: "intelligence_input_invalid",
        },
      ],
      stopReason: "queue_empty",
    });
  });

  it("stays idle when no job is claimable", async () => {
    const dependencies = setup();
    dependencies.claim.mockResolvedValue(null);
    const provider = { generate: vi.fn() };

    await expect(
      executeNextMeetingIntelligence({
        workerId: "meeting-intelligence-cron",
        leaseSeconds: 60,
        provider,
        dependencies,
      }),
    ).resolves.toEqual({ status: "idle" });
    expect(dependencies.claim).toHaveBeenCalledOnce();
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
