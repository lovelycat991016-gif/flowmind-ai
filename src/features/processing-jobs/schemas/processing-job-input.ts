import { z } from "zod";

import {
  processingJobStatuses,
  type ProcessingJobStatus,
} from "@/entities/processing-job/model/processing-job";

export const MAX_PROCESSING_JOB_ATTEMPTS = 10;
export const MAX_PROCESSING_JOB_ERROR_MESSAGE_LENGTH = 500;

const processingJobStatusSchema = z.enum(processingJobStatuses);

export const processingJobSchema = z.object({
  id: z.uuid(),
  recordingId: z.uuid(),
  meetingId: z.uuid(),
  userId: z.uuid(),
  status: processingJobStatusSchema,
  attemptCount: z.number().int().min(0).max(MAX_PROCESSING_JOB_ATTEMPTS),
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  errorMessage: z
    .string()
    .trim()
    .min(1)
    .max(MAX_PROCESSING_JOB_ERROR_MESSAGE_LENGTH)
    .nullable(),
});

const allowedTransitions: Readonly<
  Record<ProcessingJobStatus, ReadonlyArray<ProcessingJobStatus>>
> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionProcessingJobStatus(
  from: ProcessingJobStatus,
  to: ProcessingJobStatus,
) {
  return allowedTransitions[from].includes(to);
}

export const processingJobTransitionSchema = z
  .object({
    from: processingJobStatusSchema,
    to: processingJobStatusSchema,
  })
  .refine(({ from, to }) => canTransitionProcessingJobStatus(from, to), {
    message: "Invalid processing job transition.",
    path: ["to"],
  });
