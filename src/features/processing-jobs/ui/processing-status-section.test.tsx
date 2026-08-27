import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { zhCN } from "@/shared/i18n/zh-CN";
import { ProcessingStatusSection } from "./processing-status-section";

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
  uploadedAt: "2026-07-19T08:00:00.000Z",
  createdAt: "2026-07-19T07:59:00.000Z",
  updatedAt: "2026-07-19T08:00:00.000Z",
};

const processingJob = {
  id: "911a4a76-8622-49c9-b3d1-a07c55514f91",
  recordingId: recording.id,
  meetingId: recording.meetingId,
  userId: recording.userId,
  status: "queued" as const,
  attemptCount: 0,
  createdAt: "2026-07-19T08:00:00.000Z",
  startedAt: null,
  completedAt: null,
  errorMessage: null,
};

describe("ProcessingStatusSection", () => {
  it("renders the processing status for an existing recording", () => {
    render(
      <ProcessingStatusSection
        processingJob={processingJob}
        recording={recording}
      />,
    );

    expect(screen.getByRole("heading", { name: "AI 处理状态" })).toBeVisible();
    expect(
      screen.getByRole("status", { name: "AI 处理状态：等待AI处理" }),
    ).toBeVisible();
  });

  it("renders the queued status explanation", () => {
    render(
      <ProcessingStatusSection
        processingJob={processingJob}
        recording={recording}
      />,
    );

    expect(
      screen.getByText(zhCN.processingJobs.queuedDescription),
    ).toBeVisible();
  });

  it("renders a safe failure alert without exposing the failure code", () => {
    render(
      <ProcessingStatusSection
        processingJob={{
          ...processingJob,
          status: "failed",
          errorMessage: "audio_format_mismatch",
        }}
        recording={recording}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("录音格式不一致");
    expect(alert).toHaveTextContent(
      "文件内容与文件名或声明的音频类型不一致，请检查原始文件。",
    );
    expect(alert).not.toHaveTextContent("audio_format_mismatch");
    expect(
      screen.getByRole("status", { name: "AI 处理状态：处理失败" }),
    ).toBeVisible();
  });

  it.each(["queued", "running", "completed", "cancelled"] as const)(
    "does not render a failure alert for %s jobs",
    (status) => {
      render(
        <ProcessingStatusSection
          processingJob={{ ...processingJob, status }}
          recording={recording}
        />,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("hides the processing section when no recording exists", () => {
    render(
      <ProcessingStatusSection
        processingJob={processingJob}
        recording={null}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "AI 处理状态" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
