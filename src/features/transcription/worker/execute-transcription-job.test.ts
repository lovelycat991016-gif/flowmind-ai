import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimNextProcessingJob: vi.fn(),
  getRecordingAudioForClaimedJob: vi.fn(),
  completeTranscriptionJob: vi.fn(),
  failTranscriptionJob: vi.fn(),
  createInvocationToken: vi.fn(),
}));

vi.mock("./claim-processing-job", () => ({
  claimNextProcessingJob: mocks.claimNextProcessingJob,
}));
vi.mock("./recording-source", () => ({
  getRecordingAudioForClaimedJob: mocks.getRecordingAudioForClaimedJob,
}));
vi.mock("./transcription-job-persistence", () => ({
  completeTranscriptionJob: mocks.completeTranscriptionJob,
  failTranscriptionJob: mocks.failTranscriptionJob,
}));
vi.mock("./create-invocation-token", () => ({
  createInvocationToken: mocks.createInvocationToken,
}));

import { WhisperProviderError } from "../providers/openai-whisper-provider";
import { AliyunAsrTranscriptionProvider } from "../providers/aliyun-asr-transcription-provider";
import {
  m4aBytes,
  mp3Bytes,
  webmBytes,
} from "../../recordings/audio-format/audio-format-test-fixtures";
import { executeNextTranscriptionJob } from "./execute-transcription-job";

const workerId = "transcription-cron";
const invocationToken =
  "transcription-cron:550e8400-e29b-41d4-a716-446655440000";
const correlationId =
  "transcription-correlation:6d45fa52-e6cd-46f3-b7a6-2866af0c5891";
const job = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recordingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  userId: "4050a593-2e4a-4d28-ae62-6eeac8ea9065",
  attemptCount: 1,
  maxAttempts: 3,
  lockedAt: "2026-07-20T08:00:00.000Z",
  lockedBy: invocationToken,
  leaseExpiresAt: "2026-07-20T08:05:00.000Z",
};

const secondJob = {
  ...job,
  id: "1eed9e63-1615-4e16-9ce5-a56384209c25",
  recordingId: "248d6c15-fc45-4037-bda3-0f25d9e18414",
};

const audio = {
  recording: {},
  filename: "weekly-sync.webm",
  mimeType: "audio/webm",
  bytes: webmBytes,
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

const provider = { transcribe: vi.fn() };

function queueJobs(...jobs: (typeof job)[]) {
  for (const queuedJob of jobs) {
    mocks.claimNextProcessingJob.mockResolvedValueOnce(queuedJob);
  }
  mocks.claimNextProcessingJob.mockResolvedValueOnce(null);
}

function processedResult(
  jobs: Array<
    | { status: "completed"; jobId: string }
    | { status: "failed"; jobId: string; code: string }
  >,
  stopReason: "queue_empty" | "budget_exhausted" = "queue_empty",
) {
  return { status: "processed", jobs, stopReason };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claimNextProcessingJob.mockReset();
  mocks.getRecordingAudioForClaimedJob.mockReset();
  mocks.completeTranscriptionJob.mockReset();
  mocks.failTranscriptionJob.mockReset();
  provider.transcribe.mockReset();
  mocks.completeTranscriptionJob.mockResolvedValue(undefined);
  mocks.failTranscriptionJob.mockResolvedValue(undefined);
  mocks.createInvocationToken.mockImplementation((workerRole: string) =>
    workerRole === "transcription-correlation"
      ? correlationId
      : invocationToken,
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe("executeNextTranscriptionJob", () => {
  it("claims, transcribes, and persists two queued jobs before the queue becomes empty", async () => {
    let currentTimeMs = 0;
    queueJobs(job, secondJob);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe.mockResolvedValue(result);
    mocks.completeTranscriptionJob
      .mockImplementationOnce(async () => {
        currentTimeMs = 75_000;
      })
      .mockResolvedValueOnce(undefined);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now: () => currentTimeMs,
      }),
    ).resolves.toEqual(
      processedResult([
        { status: "completed", jobId: job.id },
        { status: "completed", jobId: secondJob.id },
      ]),
    );
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledTimes(3);
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledWith({
      workerId: invocationToken,
      leaseSeconds: 300,
    });
    expect(mocks.getRecordingAudioForClaimedJob).toHaveBeenNthCalledWith(1, {
      job,
      maxInputBytes: 1_000,
    });
    expect(mocks.getRecordingAudioForClaimedJob).toHaveBeenNthCalledWith(2, {
      job: secondJob,
      maxInputBytes: 1_000,
    });
    expect(provider.transcribe).toHaveBeenCalledTimes(2);
    expect(mocks.completeTranscriptionJob).toHaveBeenNthCalledWith(1, {
      job,
      workerId: invocationToken,
      result,
    });
    expect(mocks.completeTranscriptionJob).toHaveBeenNthCalledWith(2, {
      job: secondJob,
      workerId: invocationToken,
      result,
    });
  });

  it("does not claim when the positive provider window is smaller than the full provider cap", async () => {
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(75_001);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now,
      }),
    ).resolves.toEqual({
      status: "idle",
      stopReason: "budget_exhausted",
    });
    expect(mocks.claimNextProcessingJob).not.toHaveBeenCalled();
    expect(mocks.failTranscriptionJob).not.toHaveBeenCalled();
  });

  it("claims when the full provider cap and terminal reserve remain", async () => {
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(75_000);
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe.mockResolvedValue(result);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now,
      }),
    ).resolves.toEqual(
      processedResult([{ status: "completed", jobId: job.id }]),
    );
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledTimes(2);
  });

  it("continues with the next queued job after persisting a failure", async () => {
    queueJobs(job, secondJob);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe
      .mockRejectedValueOnce(new WhisperProviderError("provider_rate_limited"))
      .mockResolvedValueOnce(result);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).resolves.toEqual(
      processedResult([
        {
          status: "failed",
          jobId: job.id,
          code: "provider_rate_limited",
        },
        { status: "completed", jobId: secondJob.id },
      ]),
    );
    expect(mocks.failTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      code: "provider_rate_limited",
    });
    expect(mocks.completeTranscriptionJob).toHaveBeenCalledWith({
      job: secondJob,
      workerId: invocationToken,
      result,
    });
  });

  it("stops before another claim after a safely claimed provider subsequently times out", async () => {
    vi.useFakeTimers();
    let currentTimeMs = 0;
    queueJobs(job, secondJob);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe
      .mockImplementationOnce(({ signal }: { signal?: AbortSignal }) =>
        new Promise((_, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new WhisperProviderError("provider_timeout")),
          );
        }),
      )
      .mockResolvedValueOnce(result);

    const execution = executeNextTranscriptionJob({
      workerId,
      leaseSeconds: 300,
      maxInputBytes: 1_000,
      provider,
      now: () => currentTimeMs,
    });

    currentTimeMs = 120_000;
    await vi.advanceTimersByTimeAsync(120_000);

    await expect(execution).resolves.toEqual(
      processedResult(
        [
          {
            status: "failed",
            jobId: job.id,
            code: "provider_timeout",
          },
        ],
        "budget_exhausted",
      ),
    );
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledOnce();
    expect(provider.transcribe).toHaveBeenCalledOnce();
  });

  it("does not claim another job when a completed job leaves a positive but unsafe provider window", async () => {
    let currentTimeMs = 0;
    mocks.claimNextProcessingJob.mockResolvedValueOnce(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe.mockResolvedValue(result);
    mocks.completeTranscriptionJob.mockImplementation(async () => {
      currentTimeMs = 75_001;
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now: () => currentTimeMs,
      }),
    ).resolves.toEqual(
      processedResult(
        [{ status: "completed", jobId: job.id }],
        "budget_exhausted",
      ),
    );
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledOnce();
  });

  it("logs persistence and total worker latency after successful completion", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    let currentTimeMs = 100;
    mocks.claimNextProcessingJob
      .mockResolvedValueOnce(job)
      .mockImplementationOnce(async () => {
        currentTimeMs = 74_025;
        return null;
      });
    mocks.getRecordingAudioForClaimedJob.mockImplementation(async () => {
      currentTimeMs = 200;
      return audio;
    });
    provider.transcribe.mockImplementation(async () => {
      currentTimeMs = 74_000;
      return result;
    });
    mocks.completeTranscriptionJob.mockImplementation(async () => {
      currentTimeMs = 74_020;
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now: () => currentTimeMs,
      }),
    ).resolves.toEqual(
      processedResult([{ status: "completed", jobId: job.id }]),
    );

    expect(consoleInfo).toHaveBeenCalledWith(
      "TRANSCRIPTION_PERSISTENCE_COMPLETED",
      {
        correlationId,
        jobId: job.id,
        persistenceLatencyMs: 20,
      },
    );
    expect(consoleInfo).toHaveBeenCalledWith("TRANSCRIPTION_WORKER_COMPLETED", {
      correlationId,
      jobId: job.id,
      processedJobCount: 1,
      stopReason: "queue_empty",
      totalWorkerLatencyMs: 73_925,
    });
  });

  it("passes mapped FlashRecognizer transcript content and segments to completion persistence", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue({
      ...audio,
      filename: "临猗县图书馆-real.mp3",
      mimeType: "audio/mpeg",
      bytes: mp3Bytes,
    });
    const aliyunProvider = new AliyunAsrTranscriptionProvider({
      appKey: "test-app-key",
      tokenClient: { getToken: vi.fn().mockResolvedValue("temporary-token") },
      transport: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            task_id: "task-success",
            status: 20000000,
            message: "SUCCESS",
            flash_result: {
              duration: 2410,
              completed: true,
              sentences: [
                {
                  begin_time: 0,
                  end_time: 1200,
                  text: "临猗县图书馆第一段转写。",
                  channel_id: 0,
                },
                {
                  begin_time: 1300,
                  end_time: 2410,
                  text: "第二段内容继续保留。",
                  channel_id: 0,
                },
              ],
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 2_000_000,
        provider: aliyunProvider,
      }),
    ).resolves.toEqual(
      processedResult([{ status: "completed", jobId: job.id }]),
    );

    expect(mocks.completeTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      result: {
        provider: "aliyun",
        providerModel: "flash-recognizer",
        language: null,
        content: "临猗县图书馆第一段转写。\n第二段内容继续保留。",
        segments: [
          {
            segmentIndex: 0,
            startMs: 0,
            endMs: 1200,
            content: "临猗县图书馆第一段转写。",
          },
          {
            segmentIndex: 1,
            startMs: 1300,
            endMs: 2410,
            content: "第二段内容继续保留。",
          },
        ],
      },
    });
  });

  it("does not start Whisper after storage consumes the terminal persistence reserve", async () => {
    let currentTimeMs = 0;
    mocks.claimNextProcessingJob.mockResolvedValueOnce(job);
    mocks.getRecordingAudioForClaimedJob.mockImplementation(async () => {
      currentTimeMs = 195_000;
      return audio;
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
        now: () => currentTimeMs,
      }),
    ).resolves.toEqual(
      processedResult(
        [{ status: "failed", jobId: job.id, code: "provider_timeout" }],
        "budget_exhausted",
      ),
    );

    expect(mocks.claimNextProcessingJob).toHaveBeenCalledOnce();
    expect(provider.transcribe).not.toHaveBeenCalled();
    expect(mocks.failTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      code: "provider_timeout",
    });
  });

  it("fails a declared MP3 containing M4A bytes before Aliyun token or transport dispatch", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue({
      ...audio,
      filename: "王村小学.mp3",
      mimeType: "audio/mpeg",
      bytes: m4aBytes,
    });
    const getToken = vi.fn().mockResolvedValue("unused-token");
    const transport = vi.fn().mockRejectedValue(new Error("must not dispatch"));
    const aliyunProvider = new AliyunAsrTranscriptionProvider({
      appKey: "test-app-key",
      tokenClient: { getToken },
      transport,
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 2_000_000,
        provider: aliyunProvider,
      }),
    ).resolves.toEqual(
      processedResult([
        {
          status: "failed",
          jobId: job.id,
          code: "audio_format_mismatch",
        },
      ]),
    );

    expect(getToken).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    expect(mocks.failTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      code: "audio_format_mismatch",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "TRANSCRIPTION_WORKER_FAILED",
      expect.objectContaining({ failureCode: "audio_format_mismatch" }),
    );
  });

  it("fails unknown bytes before provider dispatch", async () => {
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue({
      ...audio,
      filename: "unknown.mp3",
      mimeType: "audio/mpeg",
      bytes: new Uint8Array([1, 2, 3, 4]),
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).resolves.toEqual(
      processedResult([
        {
          status: "failed",
          jobId: job.id,
          code: "audio_format_unrecognized",
        },
      ]),
    );
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it("fails a declaration outside the supported MIME contract before provider dispatch", async () => {
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue({
      ...audio,
      filename: "meeting.aac",
      mimeType: "audio/aac",
      bytes: m4aBytes,
    });

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).resolves.toEqual(
      processedResult([
        {
          status: "failed",
          jobId: job.id,
          code: "audio_format_unsupported",
        },
      ]),
    );
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it("aborts Whisper at the timeout reduced by storage delay", async () => {
    vi.useFakeTimers();
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const addEventListener = vi.spyOn(AbortSignal.prototype, "addEventListener");
    let currentTimeMs = 0;
    mocks.claimNextProcessingJob.mockResolvedValueOnce(job);
    mocks.getRecordingAudioForClaimedJob.mockImplementation(async () => {
      currentTimeMs = 180_000;
      return audio;
    });
    provider.transcribe.mockImplementation(({ signal }: { signal?: AbortSignal }) =>
      new Promise((_, reject) => {
        signal?.addEventListener("abort", () =>
          reject(new WhisperProviderError("provider_timeout")),
        );
      }),
    );

    const execution = executeNextTranscriptionJob({
      workerId,
      leaseSeconds: 300,
      maxInputBytes: 1_000,
      provider,
      now: () => currentTimeMs,
    });

    await vi.advanceTimersByTimeAsync(0);
    currentTimeMs = 195_000;
    await vi.advanceTimersByTimeAsync(15_000);

    await expect(execution).resolves.toEqual(
      processedResult(
        [{ status: "failed", jobId: job.id, code: "provider_timeout" }],
        "budget_exhausted",
      ),
    );
    expect(mocks.claimNextProcessingJob).toHaveBeenCalledOnce();
    expect(mocks.failTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      code: "provider_timeout",
    });
    expect(addEventListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
      { once: true },
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "ALIYUN_ASR_ABORT_SIGNALLED",
      {
        correlationId,
        elapsedMs: 195_000,
        jobId: job.id,
      },
    );
  });

  it("returns idle without downloading audio when no job is claimable", async () => {
    mocks.claimNextProcessingJob.mockResolvedValue(null);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).resolves.toEqual({ status: "idle" });
    expect(mocks.getRecordingAudioForClaimedJob).not.toHaveBeenCalled();
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it("logs a safe claim diagnostic while preserving the generic rejection", async () => {
    const error = new Error("claim request failed with token=secret-value");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.claimNextProcessingJob.mockRejectedValue(error);

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).rejects.toThrow("Unable to execute transcription job.");

    expect(consoleError).toHaveBeenCalledWith(
      "CLAIM_TRANSCRIPTION_JOB_FAILED",
      expect.objectContaining({
        error: expect.objectContaining({ name: "Error" }),
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-value");
  });

  it("records a safe provider failure for the claimed job without exposing provider detail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    queueJobs(job);
    mocks.getRecordingAudioForClaimedJob.mockResolvedValue(audio);
    provider.transcribe.mockRejectedValue(
      new WhisperProviderError("provider_rate_limited"),
    );

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).resolves.toEqual(
      processedResult([
        {
          status: "failed",
          jobId: job.id,
          code: "provider_rate_limited",
        },
      ]),
    );
    expect(mocks.failTranscriptionJob).toHaveBeenCalledWith({
      job,
      workerId: invocationToken,
      code: "provider_rate_limited",
    });
    expect(mocks.completeTranscriptionJob).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "TRANSCRIPTION_WORKER_FAILED",
      expect.objectContaining({
        jobId: job.id,
        failureCode: "provider_rate_limited",
      }),
    );
  });

  it("returns a generic error when failure persistence cannot release a claimed job", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.claimNextProcessingJob.mockResolvedValueOnce(job);
    mocks.getRecordingAudioForClaimedJob.mockRejectedValue(
      new Error("unexpected storage implementation detail"),
    );
    mocks.failTranscriptionJob.mockRejectedValue(
      new Error("unsafe database implementation detail"),
    );

    await expect(
      executeNextTranscriptionJob({
        workerId,
        leaseSeconds: 300,
        maxInputBytes: 1_000,
        provider,
      }),
    ).rejects.toThrow("Unable to execute transcription job.");
    expect(consoleError).toHaveBeenCalledWith(
      "FAIL_TRANSCRIPTION_JOB_PERSIST_FAILED",
      expect.objectContaining({ jobId: job.id }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "unsafe database implementation detail",
    );
  });
});
