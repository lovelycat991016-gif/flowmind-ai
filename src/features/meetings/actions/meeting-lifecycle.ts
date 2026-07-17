"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { meetingIdSchema } from "@/features/meetings/schemas/meeting-input";
import { createClient } from "@/shared/lib/supabase/server";

type Lifecycle = "archive" | "restore" | "delete";

export async function runMeetingLifecycleAction(formData: FormData, lifecycle: Lifecycle) {
  const parsed = meetingIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) return notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mutation = lifecycle === "delete"
    ? supabase.from("meetings").delete()
    : supabase.from("meetings").update({ archived_at: lifecycle === "archive" ? new Date().toISOString() : null });
  const { data, error } = await mutation.eq("id", parsed.data).select("id").single();
  if (!data && !error) return notFound();
  if (error || !data) return notFound();

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  revalidatePath(`/meetings/${parsed.data}`);
  if (lifecycle === "delete") redirect("/meetings" as Route);
}
