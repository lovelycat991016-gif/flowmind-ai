"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { renameMeetingSchema } from "@/features/meetings/schemas/meeting-input";
import { createClient } from "@/shared/lib/supabase/server";
import { zhCN } from "@/shared/i18n/zh-CN";
import {
  firstFieldErrors,
  type MeetingActionState,
} from "./meeting-action-state";

export async function renameMeetingAction(
  _previous: MeetingActionState,
  formData: FormData,
): Promise<MeetingActionState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    meetingDateLocal: "",
  };
  const parsed = renameMeetingSchema.safeParse({
    id: formData.get("id"),
    title: values.title,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: zhCN.meetings.validation.checkFields,
      fieldErrors: firstFieldErrors(parsed.error.issues),
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
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id)
    .select("id")
    .single();

  if (!data && !error) notFound();
  if (error || !data) {
    return {
      status: "error",
      message: zhCN.meetings.validation.renameFailed,
      fieldErrors: {},
      values,
    };
  }

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  revalidatePath(`/meetings/${data.id}`);
  return {
    status: "success",
    message: zhCN.meetings.renamed,
    fieldErrors: {},
    values: { title: parsed.data.title, meetingDateLocal: "" },
  };
}
