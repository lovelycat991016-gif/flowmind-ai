import { describe, expect, it } from "vitest";

import {
  isActiveProcessingJobStatus,
  processingJobStatuses,
  type ProcessingJob,
} from "./processing-job";

describe("processing job domain", () => {
  it("defines a valid processing job and every persisted status", () => {
    const job: ProcessingJob = {
      id: "8adbd773-54f0-42b6-aea6-f14368d708a2",
      recordingId: "0a1dc2ee-5b1a-4dd4-b1f6-0e3a5fe70b23",
      meetingId: "f883a15b-dcc4-4fb6-84c7-16e5387f55c2",
      userId: "4050a593-2e4a-4d28-ae62-6eeac8ea9065",
      status: "queued",
      attemptCount: 0,
      createdAt: "2026-07-19T08:00:00.000Z",
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };

    expect(job.status).toBe("queued");
    expect(processingJobStatuses).toEqual([
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
    ]);
  });

  it("identifies queued and running jobs as active", () => {
    expect(isActiveProcessingJobStatus("queued")).toBe(true);
    expect(isActiveProcessingJobStatus("running")).toBe(true);
    expect(isActiveProcessingJobStatus("completed")).toBe(false);
    expect(isActiveProcessingJobStatus("failed")).toBe(false);
    expect(isActiveProcessingJobStatus("cancelled")).toBe(false);
  });
});
