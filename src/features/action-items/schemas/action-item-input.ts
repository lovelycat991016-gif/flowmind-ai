import { z } from "zod";
import {
  actionItemStatuses,
  type ActionItemStatus,
} from "@/entities/action-item/model/action-item";
export const createActionItemFromIntelligenceSchema = z.object({
  meetingId: z.uuid(),
  intelligenceId: z.uuid(),
  actionItemIndex: z.coerce.number().int().min(0),
});
const allowed: Record<ActionItemStatus, ActionItemStatus[]> = {
  open: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
export const actionItemStatusTransitionSchema = z
  .object({ from: z.enum(actionItemStatuses), to: z.enum(actionItemStatuses) })
  .refine(({ from, to }) => allowed[from].includes(to), {
    path: ["to"],
    message: "Invalid action item transition.",
  });

export const updateActionItemStatusSchema = z.object({
  meetingId: z.uuid(),
  actionItemId: z.uuid(),
  status: z.enum(actionItemStatuses),
});
