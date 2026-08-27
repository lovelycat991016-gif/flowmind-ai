import { beforeEach, describe, expect, it, vi } from "vitest";

const { createWorkerServiceRoleClient } = vi.hoisted(() => ({
  createWorkerServiceRoleClient: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/service-role", () => ({
  createWorkerServiceRoleClient,
}));

import { getRecordingAudioForClaimedJob } from "./recording-source";

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

const recordingRow = {
  id: job.recordingId,
  meeting_id: "db48f0b5-aa52-4397-8e6c-df2f9114ae16",
  user_id: job.userId,
  storage_bucket: "recordings",
  storage_path: `${job.userId}/meeting/${job.recordingId}.webm`,
  original_filename: "weekly-sync.webm",
  mime_type: "audio/webm",
  file_size_bytes: 4,
  status: "uploaded",
  meetings: { user_id: job.userId },
};

function createRecordingQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

beforeEach(() => vi.clearAllMocks());

describe("getRecordingAudioForClaimedJob", () => {
  it("downloads the exact private object after validating claimed recording ownership", async () => {
    const query = createRecordingQuery({ data: recordingRow, error: null });
    const download = vi.fn().mockResolvedValue({
      data: {
        size: 5,
        arrayBuffer: vi
          .fn()
          .mockResolvedValue(new TextEncoder().encode("audio").buffer),
      },
      error: null,
    });
    const storageFrom = vi.fn().mockReturnValue({ download });
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
      storage: { from: storageFrom },
    });

    await expect(
      getRecordingAudioForClaimedJob({ job, maxInputBytes: 10 }),
    ).resolves.toMatchObject({
      filename: "weekly-sync.webm",
      mimeType: "audio/webm",
      bytes: new Uint8Array([97, 117, 100, 105, 111]),
    });
    expect(storageFrom).toHaveBeenCalledWith("recordings");
    expect(download).toHaveBeenCalledWith(recordingRow.storage_path);
  });

  it("rejects an unsupported MIME type before downloading from Storage", async () => {
    const query = createRecordingQuery({
      data: { ...recordingRow, mime_type: "video/mp4" },
      error: null,
    });
    const download = vi.fn();
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
      storage: { from: vi.fn().mockReturnValue({ download }) },
    });

    await expect(
      getRecordingAudioForClaimedJob({ job, maxInputBytes: 10 }),
    ).rejects.toMatchObject({
      code: "audio_format_unsupported",
    });
    expect(download).not.toHaveBeenCalled();
  });

  it("rejects metadata over the configured provider limit before downloading", async () => {
    const query = createRecordingQuery({
      data: { ...recordingRow, file_size_bytes: 11 },
      error: null,
    });
    const download = vi.fn();
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
      storage: { from: vi.fn().mockReturnValue({ download }) },
    });

    await expect(
      getRecordingAudioForClaimedJob({ job, maxInputBytes: 10 }),
    ).rejects.toMatchObject({
      code: "transcription_input_too_large",
    });
    expect(download).not.toHaveBeenCalled();
  });

  it("returns a safe missing-object failure without exposing Storage details", async () => {
    const query = createRecordingQuery({ data: recordingRow, error: null });
    createWorkerServiceRoleClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "private storage object details" },
          }),
        }),
      },
    });

    await expect(
      getRecordingAudioForClaimedJob({ job, maxInputBytes: 10 }),
    ).rejects.toMatchObject({
      code: "storage_object_missing",
    });
  });
});
