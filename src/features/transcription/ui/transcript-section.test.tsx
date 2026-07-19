import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TranscriptSection } from "./transcript-section";

const recording = {
  id: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
  meetingId: "cfb378e0-88e2-4cbf-946f-a8ca8f6df536",
  userId: "2c15dfe2-ea8c-420e-85ad-e85901974931",
  storageBucket: "recordings",
  storagePath: "owner/meeting/recording.webm",
  originalFilename: "weekly-review.webm",
  mimeType: "audio/webm",
  fileSizeBytes: 1024,
  status: "uploaded" as const,
  uploadedAt: "2026-07-20T08:00:00.000Z",
  createdAt: "2026-07-20T08:00:00.000Z",
  updatedAt: "2026-07-20T08:00:00.000Z",
};

const processingJob = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recordingId: recording.id,
  meetingId: recording.meetingId,
  userId: recording.userId,
  status: "completed" as const,
  attemptCount: 1,
  createdAt: "2026-07-20T08:00:00.000Z",
  startedAt: "2026-07-20T08:00:05.000Z",
  completedAt: "2026-07-20T08:01:00.000Z",
  errorMessage: null,
};

const transcript = {
  id: "f734eca3-8ea2-47ed-9eaa-0c3c4ec0f83f",
  recordingId: recording.id,
  userId: recording.userId,
  provider: "openai",
  providerModel: "whisper-1",
  language: "zh",
  content: "本周项目进展顺利。下周继续推进。",
  completedAt: "2026-07-20T08:01:00.000Z",
  createdAt: "2026-07-20T08:01:00.000Z",
  updatedAt: "2026-07-20T08:01:00.000Z",
  segments: [
    {
      segmentIndex: 0,
      startMs: 0,
      endMs: 1200,
      content: "本周项目进展顺利。",
    },
    {
      segmentIndex: 1,
      startMs: 1200,
      endMs: 2400,
      content: "下周继续推进。",
    },
  ],
};

describe("TranscriptSection", () => {
  it("hides the transcript section when the meeting has no recording", () => {
    render(
      <TranscriptSection
        processingJob={null}
        recording={null}
        transcript={null}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "转录内容" }),
    ).not.toBeInTheDocument();
  });

  it("announces a safe processing state while transcript generation is pending", () => {
    render(
      <TranscriptSection
        processingJob={{ ...processingJob, status: "running" }}
        recording={recording}
        transcript={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "转录内容" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("正在生成转录内容");
  });

  it("renders transcript content and an accessible ordered segment list", () => {
    render(
      <TranscriptSection
        processingJob={processingJob}
        recording={recording}
        transcript={transcript}
      />,
    );

    expect(screen.getByText(transcript.content)).toBeVisible();
    expect(screen.getByText("识别语言：中文")).toBeVisible();
    expect(screen.getByRole("list", { name: "转录分段" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("00:00 - 00:01")).toBeVisible();
  });

  it("keeps archived meetings read-only while showing an existing transcript", () => {
    render(
      <TranscriptSection
        archived
        processingJob={processingJob}
        recording={recording}
        transcript={transcript}
      />,
    );

    expect(screen.getByText(transcript.content)).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
