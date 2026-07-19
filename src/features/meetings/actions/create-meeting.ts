"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { MeetingActionState } from "./meeting-action-state";
import { firstFieldErrors } from "./meeting-action-state";
import { createMeetingSchema } from "@/features/meetings/schemas/meeting-input";
import { createClient } from "@/shared/lib/supabase/server";
import { zhCN } from "@/shared/i18n/zh-CN";

export async function createMeetingAction(
  _previous: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    meetingDateLocal: String(formData.get("meetingDateLocal") ?? ""),
  };
  const result = createMeetingSchema.safeParse({
    ...values,
    timezoneOffset: formData.get("timezoneOffset"),
  });
  if (!result.success) {
    return {
      status: "error",
      message: zhCN.meetings.validation.checkFields,
      fieldErrors: firstFieldErrors(result.error.issues),
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("meetings")
    .insert({ title: result.data.title, meeting_date: result.data.meetingDate })
    .select("id")
    .single();
  if (error || !data) {
    return {
      status: "error",
      message: zhCN.meetings.validation.createFailed,
      fieldErrors: {},
      values,
    };
  }

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  redirect(`/meetings/${data.id}` as Route);
}
