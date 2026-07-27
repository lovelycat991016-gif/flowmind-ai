import type {
  ActionItem,
  ActionItemStatus,
} from "@/entities/action-item/model/action-item";
import { createClient } from "@/shared/lib/supabase/server";
export async function getActionItemsForMeeting(
  meetingId: string,
): Promise<ActionItem[]> {
  const { data, error } = await (
    await createClient()
  )
    .from("action_items")
    .select(
      "id,meeting_id,title,description,owner,priority,status,due_date,created_at,updated_at",
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load action items.");
  return (
    (data ?? []) as Array<{
      id: string;
      meeting_id: string;
      title: string;
      description: string | null;
      owner: string | null;
      priority: "low" | "medium" | "high";
      status: ActionItemStatus;
      due_date: string | null;
      created_at: string;
      updated_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    title: row.title,
    description: row.description,
    owner: row.owner,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
