import type {
  MeetingAiMessage,
  MeetingAiMessageRole,
} from "@/entities/meeting-ai-message/model/meeting-ai-message";
import { createClient } from "@/shared/lib/supabase/server";

type MeetingAiMessageRow = {
  id: string;
  meeting_id: string;
  role: MeetingAiMessageRole;
  content: string;
  created_at: string;
};

export async function getMeetingAiMessages(
  meetingId: string,
): Promise<MeetingAiMessage[]> {
  const { data, error } = await (
    await createClient()
  )
    .from("meeting_ai_messages")
    .select("id,meeting_id,role,content,created_at")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to load meeting Copilot messages.");

  return ((data ?? []) as MeetingAiMessageRow[]).map((row) => ({
    id: row.id,
    meetingId: row.meeting_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}
