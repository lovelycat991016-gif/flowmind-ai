import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getRecordingForMeeting } from "./get-recording-for-meeting";

const recordingRow = {
  id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  meeting_id: "cfb378e0-88e2-4cbf-946f-a8ca8f6df536",
  user_id: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  storage_bucket: "recordings",
  storage_path:
    "2c15dfe2-ea8c-420e-85ad-e85901974931/cfb378e0-88e2-4cbf-946f-a8ca8f6df536/6b79f5f3-f083-4a75-b74b-41342f2b1454.webm",
  original_filename: "weekly-review.webm",
  mime_type: "audio/webm",
  file_size_bytes: 1024,
  status: "uploaded",
  uploaded_at: "2026-07-19T08:00:00.000Z",
  created_at: "2026-07-19T07:59:00.000Z",
  updated_at: "2026-07-19T08:00:00.000Z",
};

function recordingQuery(result: {
  data: typeof recordingRow | null;
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

describe("getRecordingForMeeting", () => {
  it("returns the authenticated owner's recording", async () => {
    const query = recordingQuery({ data: recordingRow, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(getRecordingForMeeting(recordingRow.meeting_id)).resolves.toMatchObject({
      id: recordingRow.id,
      meetingId: recordingRow.meeting_id,
      originalFilename: recordingRow.original_filename,
      status: "uploaded",
    });
    expect(query.eq).toHaveBeenCalledWith("meeting_id", recordingRow.meeting_id);
  });

  it("returns null when no recording exists", async () => {
    const query = recordingQuery({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(getRecordingForMeeting(recordingRow.meeting_id)).resolves.toBeNull();
  });

  it("returns null when another user's recording is RLS-hidden", async () => {
    const query = recordingQuery({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(getRecordingForMeeting(recordingRow.meeting_id)).resolves.toBeNull();
  });

  it("throws a safe error without exposing Supabase details", async () => {
    const query = recordingQuery({
      data: null,
      error: { message: "database credentials leaked" },
    });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(getRecordingForMeeting(recordingRow.meeting_id)).rejects.toThrow(
      "Unable to load recording.",
    );
  });
});
