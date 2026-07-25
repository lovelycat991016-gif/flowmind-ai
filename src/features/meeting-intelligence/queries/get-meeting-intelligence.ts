import type {
  MeetingIntelligenceGenerationStatus,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";
import { createClient } from "@/shared/lib/supabase/server";
export function getMeetingIntelligenceStatusPresentation(
  status: MeetingIntelligenceGenerationStatus,
) {
  return {
    state:
      status === "queued" || status === "running"
        ? "pending"
        : status === "completed"
          ? "ready"
          : "unavailable",
  } as const;
}
export async function getMeetingIntelligence(meetingId: string) {
  const { data, error } = await (
    await createClient()
  )
    .from("meeting_intelligence")
    .select("id,meeting_id,transcript_id,status,result")
    .eq("meeting_id", meetingId)
    .maybeSingle();
  if (error) throw new Error("Unable to load meeting intelligence.");
  if (!data) return null;
  const row = data as {
    id: string;
    meeting_id: string;
    transcript_id: string | null;
    status: MeetingIntelligenceGenerationStatus;
    result: unknown;
  };
  const parsed = meetingIntelligenceResultSchema.safeParse(row.result);
  return {
    id: row.id,
    meetingId: row.meeting_id,
    transcriptId: row.transcript_id,
    status: row.status,
    presentation: getMeetingIntelligenceStatusPresentation(row.status),
    result: parsed.success ? (parsed.data as MeetingIntelligenceResult) : null,
  };
}
