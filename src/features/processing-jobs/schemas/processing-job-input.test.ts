import { describe, expect, it } from "vitest";

import {
  MAX_PROCESSING_JOB_ATTEMPTS,
  MAX_PROCESSING_JOB_ERROR_MESSAGE_LENGTH,
  processingJobSchema,
  processingJobTransitionSchema,
} from "./processing-job-input";

const validJob = {
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

describe("processing job schema", () => {
  it("accepts a valid processing job", () => {
    expect(processingJobSchema.safeParse(validJob).success).toBe(true);
  });

  it("rejects invalid UUIDs and lifecycle statuses", () => {
    expect(
      processingJobSchema.safeParse({ ...validJob, id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      processingJobSchema.safeParse({ ...validJob, status: "processing" })
        .success,
    ).toBe(false);
  });

  it.each([
    ["queued", "running"],
    ["queued", "cancelled"],
    ["running", "completed"],
    ["running", "failed"],
  ])("allows %s to %s", (from, to) => {
    expect(processingJobTransitionSchema.safeParse({ from, to }).success).toBe(
      true,
    );
  });

  it.each([
    ["queued", "completed"],
    ["running", "cancelled"],
    ["completed", "running"],
    ["failed", "running"],
    ["cancelled", "running"],
  ])("rejects %s to %s", (from, to) => {
    expect(processingJobTransitionSchema.safeParse({ from, to }).success).toBe(
      false,
    );
  });

  it("enforces attempt and error message boundaries", () => {
    expect(
      processingJobSchema.safeParse({ ...validJob, attemptCount: 0 }).success,
    ).toBe(true);
    expect(
      processingJobSchema.safeParse({
        ...validJob,
        attemptCount: MAX_PROCESSING_JOB_ATTEMPTS,
      }).success,
    ).toBe(true);
    expect(
      processingJobSchema.safeParse({ ...validJob, attemptCount: -1 }).success,
    ).toBe(false);
    expect(
      processingJobSchema.safeParse({
        ...validJob,
        attemptCount: MAX_PROCESSING_JOB_ATTEMPTS + 1,
      }).success,
    ).toBe(false);
    expect(
      processingJobSchema.safeParse({
        ...validJob,
        errorMessage: "x".repeat(MAX_PROCESSING_JOB_ERROR_MESSAGE_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      processingJobSchema.safeParse({
        ...validJob,
        errorMessage: "x".repeat(MAX_PROCESSING_JOB_ERROR_MESSAGE_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});
