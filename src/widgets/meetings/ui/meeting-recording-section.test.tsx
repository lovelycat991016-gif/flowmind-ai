import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/recordings/ui/recording-upload-form", () => ({
  RecordingUploadForm: ({ meetingId }: { meetingId: string }) => (
    <div aria-label="上传录音表单" data-meeting-id={meetingId} />
  ),
}));

import { MeetingRecordingSection } from "./meeting-recording-section";

const meetingId = "cfb378e0-88e2-4cbf-946f-a8ca8f6df536";

describe("MeetingRecordingSection", () => {
  it("shows an accessible empty state and upload action without a recording", () => {
    render(
      <MeetingRecordingSection
        archived={false}
        meetingId={meetingId}
        recording={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "会议录音" })).toBeVisible();
    expect(screen.getByText("暂无录音")).toBeVisible();
    expect(screen.getByLabelText("上传录音表单")).toHaveAttribute(
      "data-meeting-id",
      meetingId,
    );
  });

  it("shows uploaded recording metadata and status", () => {
    render(
      <MeetingRecordingSection
        archived={false}
        meetingId={meetingId}
        recording={{
          id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
          meetingId,
          userId: "2c15dfe2-ea8c-420e-85ad-e85901974931",
          storageBucket: "recordings",
          storagePath: "owner/meeting/recording.webm",
          originalFilename: "weekly-review.webm",
          mimeType: "audio/webm",
          fileSizeBytes: 1024,
          status: "uploaded",
          uploadedAt: "2026-07-19T08:00:00.000Z",
          createdAt: "2026-07-19T07:59:00.000Z",
          updatedAt: "2026-07-19T08:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("weekly-review.webm")).toBeVisible();
    expect(screen.getByText("1 KB")).toBeVisible();
    expect(screen.getByText("已上传")).toBeVisible();
    expect(screen.getByText(/上传时间/)).toBeVisible();
    expect(screen.queryByLabelText("上传录音表单")).not.toBeInTheDocument();
  });

  it("keeps archived meetings read-only when no recording exists", () => {
    render(
      <MeetingRecordingSection
        archived
        meetingId={meetingId}
        recording={null}
      />,
    );

    expect(screen.getByText("归档会议暂不支持上传录音。")).toBeVisible();
    expect(screen.queryByLabelText("上传录音表单")).not.toBeInTheDocument();
  });

  it("shows a safe retry path for failed recordings", () => {
    render(
      <MeetingRecordingSection
        archived={false}
        meetingId={meetingId}
        recording={{
          id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
          meetingId,
          userId: "2c15dfe2-ea8c-420e-85ad-e85901974931",
          storageBucket: "recordings",
          storagePath: "owner/meeting/recording.webm",
          originalFilename: "weekly-review.webm",
          mimeType: "audio/webm",
          fileSizeBytes: 1024,
          status: "failed",
          uploadedAt: null,
          createdAt: "2026-07-19T07:59:00.000Z",
          updatedAt: "2026-07-19T08:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "录音上传失败，请重试。",
    );
    expect(screen.getByLabelText("上传录音表单")).toBeInTheDocument();
  });
});
