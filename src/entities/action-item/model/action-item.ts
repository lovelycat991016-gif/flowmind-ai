export const actionItemStatuses = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type ActionItemStatus = (typeof actionItemStatuses)[number];
export type ActionItem = {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  owner: string | null;
  priority: "low" | "medium" | "high";
  status: ActionItemStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
