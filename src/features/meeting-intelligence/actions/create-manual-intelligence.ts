"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { manualIntelligenceInputSchema } from "@/features/meeting-intelligence/schemas/manual-intelligence-input";
import { zhCN } from "@/shared/i18n/zh-CN";
import { createClient } from "@/shared/lib/supabase/server";

import type { ManualIntelligenceActionState } from "./manual-intelligence-action-state";

export async function createManualIntelligenceAction(
  _previous: ManualIntelligenceActionState,
  formData: FormData,
): Promise<ManualIntelligenceActionState> {
  const value = String(formData.get("inputText") ?? "");
  const parsed = manualIntelligenceInputSchema.safeParse({
    meetingId: formData.get("meetingId"),
    inputText: value,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? zhCN.intelligence.inputInvalid,
      value,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id,archived_at")
    .eq("id", parsed.data.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meetingError || !meeting || meeting.archived_at) {
    return {
      status: "error",
      message: zhCN.intelligence.inputUnavailable,
      value: parsed.data.inputText,
    };
  }

  const { data, error } = await supabase
    .from("meeting_intelligence")
    .insert({
      meeting_id: meeting.id,
      user_id: user.id,
      input_text: parsed.data.inputText,
      status: "queued",
      attempt_count: 0,
    })
    .select("id")
    .single();
  if (error || !data) {
    return {
      status: "error",
      message: zhCN.intelligence.createFailed,
      value: parsed.data.inputText,
    };
  }

  revalidatePath(`/meetings/${meeting.id}`);
  return {
    status: "success",
    message: zhCN.intelligence.queued,
    value: "",
  };
}
