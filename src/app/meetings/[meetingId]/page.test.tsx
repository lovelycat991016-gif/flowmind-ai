import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMeetingById: vi.fn(),
  getProcessingJobForRecording: vi.fn(),
  getRecordingForMeeting: vi.fn(),
  getTranscriptForRecording: vi.fn(),
  getMeetingIntelligence: vi.fn(),
  getMeetingAiMessages: vi.fn(),
  getActionItemsForMeeting: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/features/meetings/queries/get-meetings", () => ({
  getMeetingById: mocks.getMeetingById,
}));
vi.mock("@/features/recordings/queries/get-recording-for-meeting", () => ({
  getRecordingForMeeting: mocks.getRecordingForMeeting,
}));
vi.mock(
  "@/features/processing-jobs/queries/get-processing-job-for-recording",
  () => ({
    getProcessingJobForRecording: mocks.getProcessingJobForRecording,
  }),
);
vi.mock(
  "@/features/meeting-intelligence/queries/get-meeting-intelligence",
  () => ({ getMeetingIntelligence: mocks.getMeetingIntelligence }),
);
vi.mock(
  "@/features/transcription/queries/get-transcript-for-recording",
  () => ({
    getTranscriptForRecording: mocks.getTranscriptForRecording,
  }),
);
vi.mock("@/features/meeting-copilot/queries/get-meeting-ai-messages", () => ({
  getMeetingAiMessages: mocks.getMeetingAiMessages,
}));
vi.mock("@/features/action-items/queries/get-action-items-for-meeting", () => ({
  getActionItemsForMeeting: mocks.getActionItemsForMeeting,
}));
vi.mock("@/widgets/meetings/ui/meeting-detail", () => ({
  MeetingDetail: ({
    intelligence,
    processingJob,
    transcript,
  }: {
    intelligence?: { status: string } | null;
    processingJob?: { status: string } | null;
    transcript?: { id: string } | null;
  }) => (
    <div
      data-processing-status={processingJob?.status ?? "none"}
      data-intelligence-status={intelligence?.status ?? "none"}
      data-transcript-id={transcript?.id ?? "none"}
      data-testid="processing-status"
    />
  ),
}));

import MeetingDetailPage from "./page";

const meeting = {
  id: "cfb378e0-88e2-4cbf-946f-a8ca8f6df536",
  title: "每周产品例会",
  meetingDate: "2026-07-19T08:00:00.000Z",
  archivedAt: null,
  createdAt: "2026-07-19T07:59:00.000Z",
  updatedAt: "2026-07-19T08:00:00.000Z",
};

const recording = {
  id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  meetingId: meeting.id,
  userId: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  storageBucket: "recordings",
  storagePath: "owner/meeting/recording.webm",
  originalFilename: "weekly-review.webm",
  mimeType: "audio/webm",
  fileSizeBytes: 1024,
  status: "uploaded" as const,
  uploadedAt: "2026-07-19T08:00:00.000Z",
  createdAt: "2026-07-19T07:59:00.000Z",
  updatedAt: "2026-07-19T08:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMeetingById.mockResolvedValue(meeting);
  mocks.getMeetingAiMessages.mockResolvedValue([]);
  mocks.getActionItemsForMeeting.mockResolvedValue([]);
});

describe("MeetingDetailPage", () => {
  it("loads the processing job only when the meeting has a recording", async () => {
    mocks.getRecordingForMeeting.mockResolvedValue(recording);
    mocks.getProcessingJobForRecording.mockResolvedValue({ status: "queued" });
    mocks.getTranscriptForRecording.mockResolvedValue({
      id: "f734eca3-8ea2-47ed-9eaa-0c3c4ec0f83f",
    });
    mocks.getMeetingIntelligence.mockResolvedValue({ status: "completed" });

    render(
      await MeetingDetailPage({
        params: Promise.resolve({ meetingId: meeting.id }),
      }),
    );

    expect(mocks.getProcessingJobForRecording).toHaveBeenCalledWith(
      recording.id,
    );
    expect(mocks.getTranscriptForRecording).toHaveBeenCalledWith(recording.id);
    expect(mocks.getMeetingIntelligence).toHaveBeenCalledWith(meeting.id);
    expect(mocks.getMeetingAiMessages).toHaveBeenCalledWith(meeting.id);
    expect(mocks.getActionItemsForMeeting).toHaveBeenCalledWith(meeting.id);
    expect(screen.getByTestId("processing-status")).toHaveAttribute(
      "data-processing-status",
      "queued",
    );
    expect(screen.getByTestId("processing-status")).toHaveAttribute(
      "data-transcript-id",
      "f734eca3-8ea2-47ed-9eaa-0c3c4ec0f83f",
    );
    expect(screen.getByTestId("processing-status")).toHaveAttribute(
      "data-intelligence-status",
      "completed",
    );
  });

  it("loads manual intelligence without querying recording-derived data", async () => {
    mocks.getRecordingForMeeting.mockResolvedValue(null);
    mocks.getMeetingIntelligence.mockResolvedValue({ status: "queued" });

    render(
      await MeetingDetailPage({
        params: Promise.resolve({ meetingId: meeting.id }),
      }),
    );

    expect(mocks.getProcessingJobForRecording).not.toHaveBeenCalled();
    expect(mocks.getTranscriptForRecording).not.toHaveBeenCalled();
    expect(mocks.getMeetingIntelligence).toHaveBeenCalledWith(meeting.id);
    expect(mocks.getMeetingAiMessages).toHaveBeenCalledWith(meeting.id);
    expect(mocks.getActionItemsForMeeting).toHaveBeenCalledWith(meeting.id);
    expect(screen.getByTestId("processing-status")).toHaveAttribute(
      "data-processing-status",
      "none",
    );
    expect(screen.getByTestId("processing-status")).toHaveAttribute(
      "data-intelligence-status",
      "queued",
    );
  });
});
