import { z } from "zod";

import {
  processingJobStatuses,
  type ProcessingJobStatus,
} from "@/entities/processing-job/model/processing-job";
import { transcriptionFailureCodes } from "@/entities/transcript/model/transcript";

export const MAX_TRANSCRIPT_CONTENT_LENGTH = 1_000_000;
export const MAX_TRANSCRIPT_SEGMENT_CONTENT_LENGTH = 100_000;

const processingJobStatusSchema = z.enum(processingJobStatuses);

const providerIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);

const transcriptSegmentSchema = z
  .object({
    segmentIndex: z.number().int().min(0),
    startMs: z.number().int().min(0),
    endMs: z.number().int().min(0),
    content: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TRANSCRIPT_SEGMENT_CONTENT_LENGTH),
  })
  .refine(({ startMs, endMs }) => endMs >= startMs, {
    message: "Transcript segment end must not precede its start.",
    path: ["endMs"],
  });

export const transcriptionResultSchema = z
  .object({
    provider: providerIdentifierSchema,
    providerModel: z.string().trim().min(1).max(100),
    language: z.string().trim().min(2).max(35).nullable(),
    content: z.string().trim().min(1).max(MAX_TRANSCRIPT_CONTENT_LENGTH),
    segments: z.array(transcriptSegmentSchema).min(1),
  })
  .superRefine(({ segments }, context) => {
    for (const [index, segment] of segments.entries()) {
      if (segment.segmentIndex !== index) {
        context.addIssue({
          code: "custom",
          message: "Transcript segments must use contiguous indexes.",
          path: ["segments", index, "segmentIndex"],
        });
      }

      const previous = segments[index - 1];
      if (previous && segment.startMs < previous.endMs) {
        context.addIssue({
          code: "custom",
          message: "Transcript segments must not overlap.",
          path: ["segments", index, "startMs"],
        });
      }
    }
  });

export const transcriptionFailureCodeSchema = z.enum(transcriptionFailureCodes);

const allowedWorkerTransitions: Readonly<
  Record<ProcessingJobStatus, ReadonlyArray<ProcessingJobStatus>>
> = {
  queued: ["running"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionTranscriptionWorkerStatus(
  from: ProcessingJobStatus,
  to: ProcessingJobStatus,
) {
  return allowedWorkerTransitions[from].includes(to);
}

export const transcriptionWorkerLifecycleTransitionSchema = z
  .object({
    from: processingJobStatusSchema,
    to: processingJobStatusSchema,
  })
  .refine(({ from, to }) => canTransitionTranscriptionWorkerStatus(from, to), {
    message: "Invalid transcription worker transition.",
    path: ["to"],
  });
