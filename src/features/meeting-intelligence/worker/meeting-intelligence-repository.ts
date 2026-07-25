import type { MeetingIntelligenceFailureCode } from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { createWorkerServiceRoleClient } from "@/shared/lib/supabase/service-role";
import type { MeetingIntelligenceWorkerDependencies } from "./execute-meeting-intelligence";

function safe(code: MeetingIntelligenceFailureCode) {
  const error = new Error(
    "Unable to load meeting intelligence data.",
  ) as Error & { code: MeetingIntelligenceFailureCode };
  error.code = code;
  return error;
}
export function createMeetingIntelligenceWorkerRepository(): MeetingIntelligenceWorkerDependencies {
  return {
    async claim(workerId, leaseSeconds) {
      const { data, error } = await createWorkerServiceRoleClient().rpc(
        "claim_next_meeting_intelligence",
        { p_worker_id: workerId, p_lease_seconds: leaseSeconds },
      );
      if (error) throw new Error("Unable to claim meeting intelligence.");
      if (!data) return null;
      const row = data as {
        id: string;
        meeting_id: string;
        transcript_id: string | null;
        user_id: string;
        locked_by: string;
      };
      return {
        id: row.id,
        meetingId: row.meeting_id,
        transcriptId: row.transcript_id,
        userId: row.user_id,
        lockedBy: row.locked_by,
      };
    },
    async loadInput(job) {
      const client = createWorkerServiceRoleClient();
      const { data: intelligence, error: intelligenceError } = await client
        .from("meeting_intelligence")
        .select("input_text,transcript_id,meetings!inner(id,user_id)")
        .eq("id", job.id)
        .eq("user_id", job.userId)
        .maybeSingle();
      if (intelligenceError) throw safe("provider_unavailable");

      const intelligenceRow = intelligence as {
        input_text: string | null;
        transcript_id: string | null;
        meetings: { id: string; user_id: string };
      } | null;
      if (
        !intelligenceRow ||
        intelligenceRow.meetings.id !== job.meetingId ||
        intelligenceRow.meetings.user_id !== job.userId
      ) {
        throw safe("intelligence_input_invalid");
      }

      if (intelligenceRow.input_text) {
        return { content: intelligenceRow.input_text, language: null };
      }

      if (!intelligenceRow.transcript_id) {
        throw safe("intelligence_input_invalid");
      }

      const { data, error } = await client
        .from("transcripts")
        .select("content,language,recordings!inner(meeting_id,user_id)")
        .eq("id", intelligenceRow.transcript_id)
        .eq("user_id", job.userId)
        .maybeSingle();
      if (error) throw safe("provider_unavailable");
      const row = data as {
        content: string;
        language: string | null;
        recordings: { meeting_id: string; user_id: string };
      } | null;
      if (
        !row ||
        row.recordings.meeting_id !== job.meetingId ||
        row.recordings.user_id !== job.userId
      )
        throw safe("intelligence_input_invalid");
      return { content: row.content, language: row.language };
    },
    async complete(job, result) {
      const { data, error } = await createWorkerServiceRoleClient()
        .from("meeting_intelligence")
        .update({
          status: "completed",
          result,
          model_identifier: result.modelIdentifier,
          prompt_version: result.promptVersion,
          completed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          lease_expires_at: null,
        })
        .eq("id", job.id)
        .eq("user_id", job.userId)
        .eq("status", "running")
        .eq("locked_by", job.lockedBy)
        .select("id")
        .maybeSingle();
      if (error || !data)
        throw new Error("Unable to complete meeting intelligence.");
    },
    async fail(job, code) {
      const { data, error } = await createWorkerServiceRoleClient()
        .from("meeting_intelligence")
        .update({
          status: "failed",
          last_error_code: code,
          failed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null,
          lease_expires_at: null,
        })
        .eq("id", job.id)
        .eq("user_id", job.userId)
        .eq("status", "running")
        .eq("locked_by", job.lockedBy)
        .select("id")
        .maybeSingle();
      if (error || !data)
        throw new Error("Unable to fail meeting intelligence.");
    },
  };
}
