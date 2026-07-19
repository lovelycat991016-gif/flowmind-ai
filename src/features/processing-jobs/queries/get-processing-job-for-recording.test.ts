import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getProcessingJobForRecording } from "./get-processing-job-for-recording";

const processingJobRow = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recording_id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  user_id: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  status: "queued",
  attempt_count: 0,
  created_at: "2026-07-19T08:00:00.000Z",
  started_at: null,
  completed_at: null,
  last_error_code: null,
  recordings: {
    meeting_id: "cfb378e0-88e2-4cbf-946f-a8ca8f6df536",
  },
};

function processingJobQuery(result: {
  data: typeof processingJobRow | null;
  error: { message: string } | null;
}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

beforeEach(() => createClientMock.mockReset());

describe("getProcessingJobForRecording", () => {
  it("returns the authenticated owner's processing job", async () => {
    const query = processingJobQuery({ data: processingJobRow, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getProcessingJobForRecording(processingJobRow.recording_id),
    ).resolves.toMatchObject({
      id: processingJobRow.id,
      recordingId: processingJobRow.recording_id,
      meetingId: processingJobRow.recordings.meeting_id,
      status: "queued",
      attemptCount: 0,
    });
    expect(query.eq).toHaveBeenCalledWith(
      "recording_id",
      processingJobRow.recording_id,
    );
  });

  it("returns null when no processing job exists", async () => {
    const query = processingJobQuery({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getProcessingJobForRecording(processingJobRow.recording_id),
    ).resolves.toBeNull();
  });

  it("returns null when another user's job is RLS-hidden", async () => {
    const query = processingJobQuery({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getProcessingJobForRecording(processingJobRow.recording_id),
    ).resolves.toBeNull();
  });

  it("throws a safe error without exposing Supabase details", async () => {
    const query = processingJobQuery({
      data: null,
      error: { message: "database credentials leaked" },
    });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getProcessingJobForRecording(processingJobRow.recording_id),
    ).rejects.toThrow("Unable to load processing job.");
  });
});
