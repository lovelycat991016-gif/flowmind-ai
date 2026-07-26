import { z } from "zod";
import {
  meetingIntelligenceFailureCodes,
  meetingIntelligenceGenerationStatuses,
  type MeetingIntelligenceGenerationStatus,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
export const MAX_SUMMARY_LENGTH = 10000;
export const MAX_ACTION_ITEMS = 50;
export const MAX_DECISIONS = 50;
export const MAX_KEY_POINTS = 50;
export const MAX_RISKS = 50;
const text = z.string().trim().min(1).max(2000);
const status = z.enum(meetingIntelligenceGenerationStatuses);
const metadata = z.record(
  z.string().min(1).max(100),
  z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]),
);
export const meetingIntelligenceResultSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  modelIdentifier: z.string().trim().min(1).max(100),
  promptVersion: z.string().trim().min(1).max(100),
  summary: z.object({
    content: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
  }),
  // Defaults preserve display compatibility for intelligence generated before v2.
  keyPoints: z.array(text).max(MAX_KEY_POINTS).default([]),
  actionItems: z
    .array(
      z.object({
        content: text,
        assigneeName: z.string().trim().min(1).max(200).nullable(),
        dueDate: z.iso.date().nullable(),
        sourceSegmentIndex: z.number().int().min(0).nullable(),
      }),
    )
    .max(MAX_ACTION_ITEMS),
  decisions: z
    .array(
      z.object({
        content: text,
        sourceSegmentIndex: z.number().int().min(0).nullable(),
      }),
    )
    .max(MAX_DECISIONS),
  risks: z.array(text).max(MAX_RISKS).default([]),
  outputMetadata: metadata,
});
const allowed: Readonly<
  Record<
    MeetingIntelligenceGenerationStatus,
    readonly MeetingIntelligenceGenerationStatus[]
  >
> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};
export function canTransitionMeetingIntelligenceStatus(
  from: MeetingIntelligenceGenerationStatus,
  to: MeetingIntelligenceGenerationStatus,
) {
  return allowed[from].includes(to);
}
export const meetingIntelligenceTransitionSchema = z
  .object({ from: status, to: status })
  .refine(({ from, to }) => canTransitionMeetingIntelligenceStatus(from, to), {
    path: ["to"],
    message: "Invalid meeting intelligence transition.",
  });
export const meetingIntelligenceFailureCodeSchema = z.enum(
  meetingIntelligenceFailureCodes,
);
