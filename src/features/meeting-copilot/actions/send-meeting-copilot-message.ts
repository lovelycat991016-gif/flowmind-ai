"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMeetingCopilotProvider } from "@/features/ai-providers/factory/create-meeting-copilot-provider";
import { buildMeetingCopilotContext, retrieveMeetingCopilotSources, type MeetingCopilotSource } from "@/features/meeting-copilot/context/build-meeting-copilot-context";
import { recordServerAiUsageEvent } from "@/features/ai-usage/record-ai-usage-event";
import type { MeetingCopilotProvider } from "@/features/meeting-copilot/providers/meeting-copilot-provider";
import { meetingCopilotPromptSchema } from "@/features/meeting-copilot/schemas/meeting-copilot-input";
import { zhCN } from "@/shared/i18n/zh-CN";
import { createClient } from "@/shared/lib/supabase/server";

export type MeetingCopilotActionState = {
  status: "idle" | "error" | "success";
  message: string;
  value: string;
  sources?: MeetingCopilotSource[];
};

export const INITIAL_MEETING_COPILOT_ACTION_STATE: MeetingCopilotActionState = {
  status: "idle",
  message: "",
  value: "",
};

export async function sendMeetingCopilotMessageAction(
  _previous: MeetingCopilotActionState,
  formData: FormData,
  provider?: MeetingCopilotProvider,
): Promise<MeetingCopilotActionState> {
  const parsed = meetingCopilotPromptSchema.safeParse({
    meetingId: formData.get("meetingId"),
    prompt: formData.get("prompt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: zhCN.copilot.invalidPrompt,
      value: String(formData.get("prompt") ?? ""),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id,title,archived_at")
    .eq("id", parsed.data.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meetingError || !meeting || meeting.archived_at) {
    return {
      status: "error",
      message: zhCN.copilot.unavailable,
      value: parsed.data.prompt,
    };
  }

  const { error: userMessageError } = await supabase
    .from("meeting_ai_messages")
    .insert({
      meeting_id: meeting.id,
      user_id: user.id,
      role: "user",
      content: parsed.data.prompt,
    });
  if (userMessageError) {
    return {
      status: "error",
      message: zhCN.copilot.sendFailed,
      value: parsed.data.prompt,
    };
  }

  const startedAt = Date.now();
  let sources: MeetingCopilotSource[] = [];
  try {
    const context = await buildMeetingCopilotContext({
      meetingId: meeting.id,
      userId: user.id,
      question: parsed.data.prompt,
    });
    sources = await retrieveMeetingCopilotSources({ question: parsed.data.prompt, userId: user.id });
    const response = await (
      provider ?? createMeetingCopilotProvider()
    ).generate({
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      prompt: parsed.data.prompt,
      context,
    });
    const { error: assistantMessageError } = await supabase
      .from("meeting_ai_messages")
      .insert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: "assistant",
        content: response.content,
      });
    if (assistantMessageError) throw assistantMessageError;
    await recordServerAiUsageEvent({
      userId: user.id,
      meetingId: meeting.id,
      operationType: "meeting_copilot_response",
      provider: response.provider,
      modelIdentifier: response.modelIdentifier ?? null,
      outcome: "completed",
      failureCode: null,
      latencyMs: Date.now() - startedAt,
    });
  } catch {
    await recordServerAiUsageEvent({
      userId: user.id,
      meetingId: meeting.id,
      operationType: "meeting_copilot_response",
      provider: null,
      modelIdentifier: null,
      outcome: "failed",
      failureCode: "provider_request_failed",
      latencyMs: Date.now() - startedAt,
    });
    return {
      status: "error",
      message: zhCN.copilot.sendFailed,
      value: parsed.data.prompt,
    };
  }

  revalidatePath(`/meetings/${meeting.id}`);
  return { status: "success", message: zhCN.copilot.sent, value: "", sources };
}
