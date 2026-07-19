import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import { getTranscriptForRecording } from "./get-transcript-for-recording";

const transcriptRow = {
  id: "f734eca3-8ea2-47ed-9eaa-0c3c4ec0f83f",
  recording_id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  user_id: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  provider: "openai",
  provider_model: "whisper-1",
  language: "zh",
  content: "本周项目进展顺利。",
  completed_at: "2026-07-20T08:00:00.000Z",
  created_at: "2026-07-20T08:00:00.000Z",
  updated_at: "2026-07-20T08:00:00.000Z",
  transcript_segments: [
    {
      segment_index: 0,
      start_ms: 0,
      end_ms: 1200,
      content: "本周项目进展顺利。",
    },
  ],
};

function transcriptQuery(result: {
  data: typeof transcriptRow | null;
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

describe("getTranscriptForRecording", () => {
  it("returns the authenticated owner's transcript with ordered segments", async () => {
    const query = transcriptQuery({ data: transcriptRow, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getTranscriptForRecording(transcriptRow.recording_id),
    ).resolves.toMatchObject({
      id: transcriptRow.id,
      recordingId: transcriptRow.recording_id,
      content: transcriptRow.content,
      segments: [
        {
          segmentIndex: 0,
          startMs: 0,
          endMs: 1200,
          content: transcriptRow.content,
        },
      ],
    });
    expect(query.eq).toHaveBeenCalledWith(
      "recording_id",
      transcriptRow.recording_id,
    );
  });

  it("returns null for missing or RLS-hidden transcripts", async () => {
    const query = transcriptQuery({ data: null, error: null });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getTranscriptForRecording(transcriptRow.recording_id),
    ).resolves.toBeNull();
  });

  it("does not expose Supabase errors", async () => {
    const query = transcriptQuery({
      data: null,
      error: { message: "database implementation detail" },
    });
    createClientMock.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    await expect(
      getTranscriptForRecording(transcriptRow.recording_id),
    ).rejects.toThrow("Unable to load transcript.");
  });
});
