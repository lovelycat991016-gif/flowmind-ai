"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";
import {
  actionItemStatusTransitionSchema,
  createActionItemFromIntelligenceSchema,
  updateActionItemStatusSchema,
} from "@/features/action-items/schemas/action-item-input";
import { createClient } from "@/shared/lib/supabase/server";
import { zhCN } from "@/shared/i18n/zh-CN";
type Result = { status: "success" | "error"; message?: string };
function form(input: FormData) {
  return {
    meetingId: input.get("meetingId"),
    intelligenceId: input.get("intelligenceId"),
    actionItemIndex: input.get("actionItemIndex"),
  };
}
export async function createActionItemFromIntelligenceAction(
  data: FormData,
): Promise<Result> {
  const parsed = createActionItemFromIntelligenceSchema.safeParse(form(data));
  if (!parsed.success)
    return { status: "error", message: zhCN.actionItems.unavailable };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id,archived_at")
    .eq("id", parsed.data.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!meeting || meeting.archived_at)
    return { status: "error", message: zhCN.actionItems.unavailable };
  const { data: intelligence } = await supabase
    .from("meeting_intelligence")
    .select("id,result")
    .eq("id", parsed.data.intelligenceId)
    .eq("meeting_id", meeting.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const result = meetingIntelligenceResultSchema.safeParse(
    intelligence?.result,
  );
  const item = result.success
    ? result.data.actionItems[parsed.data.actionItemIndex]
    : null;
  if (!item) return { status: "error", message: zhCN.actionItems.unavailable };
  const { error } = await supabase.from("action_items").insert({
    meeting_id: meeting.id,
    user_id: user.id,
    title: item.content,
    description: null,
    owner: item.assigneeName,
    priority: "medium",
    status: "open",
    due_date: item.dueDate,
    source_intelligence_id: parsed.data.intelligenceId,
    source_action_item_index: parsed.data.actionItemIndex,
  });
  if (error && error.code !== "23505")
    return { status: "error", message: zhCN.actionItems.createFailed };
  revalidatePath(`/meetings/${meeting.id}`);
  revalidatePath("/dashboard");
  return { status: "success" };
}
export async function completeActionItemAction(
  data: FormData,
): Promise<Result> {
  const meetingId = String(data.get("meetingId") ?? "");
  const actionItemId = String(data.get("actionItemId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: item } = await supabase
    .from("action_items")
    .select("id,status,meetings!inner(archived_at)")
    .eq("id", actionItemId)
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  const relatedMeeting = Array.isArray(item?.meetings)
    ? item.meetings[0]
    : item?.meetings;
  if (
    !item ||
    item.status === "completed" ||
    item.status === "cancelled" ||
    relatedMeeting?.archived_at
  )
    return { status: "error", message: zhCN.actionItems.unavailable };
  const { error } = await supabase
    .from("action_items")
    .update({ status: "completed" })
    .eq("id", actionItemId)
    .eq("user_id", user.id);
  if (error) return { status: "error", message: zhCN.actionItems.updateFailed };
  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/dashboard");
  return { status: "success" };
}

export async function updateActionItemStatusAction(
  data: FormData,
): Promise<Result> {
  const parsed = updateActionItemStatusSchema.safeParse({
    meetingId: data.get("meetingId"),
    actionItemId: data.get("actionItemId"),
    status: data.get("status"),
  });
  if (!parsed.success)
    return { status: "error", message: zhCN.actionItems.unavailable };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("action_items")
    .select("id,status,meetings!inner(archived_at)")
    .eq("id", parsed.data.actionItemId)
    .eq("meeting_id", parsed.data.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  const relatedMeeting = Array.isArray(item?.meetings)
    ? item.meetings[0]
    : item?.meetings;
  const transition = item
    ? actionItemStatusTransitionSchema.safeParse({
        from: item.status,
        to: parsed.data.status,
      })
    : null;
  if (!item || relatedMeeting?.archived_at || !transition?.success)
    return { status: "error", message: zhCN.actionItems.unavailable };

  const { error } = await supabase
    .from("action_items")
    .update({ status: parsed.data.status })
    .eq("id", item.id)
    .eq("user_id", user.id);
  if (error) return { status: "error", message: zhCN.actionItems.updateFailed };

  revalidatePath(`/meetings/${parsed.data.meetingId}`);
  revalidatePath("/dashboard");
  return { status: "success" };
}
