"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { recordingLifecycleTransitionSchema } from "@/features/recordings/schemas/recording-input";
import { createClient } from "@/shared/lib/supabase/server";

import {
  type RecordingActionResult,
  recordingUploadActionError,
} from "./recording-action-state";

const recordingIdSchema = z.object({ recordingId: z.uuid() });

export async function cancelUpload(
  input: unknown,
): Promise<RecordingActionResult<{ recordingId: string }>> {
  const parsed = recordingIdSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error", message: recordingUploadActionError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recording, error: recordingError } = await supabase
    .from("recordings")
    .select("id,status")
    .eq("id", parsed.data.recordingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (recordingError || !recording) {
    return { status: "error", message: recordingUploadActionError };
  }

  const transition = recordingLifecycleTransitionSchema.safeParse({
    from: recording.status,
    to: "cancelled",
  });
  if (!transition.success) {
    return { status: "error", message: recordingUploadActionError };
  }

  const { data: updated, error: updateError } = await supabase
    .from("recordings")
    .update({ status: "cancelled" })
    .eq("id", recording.id)
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (updateError || !updated) {
    return { status: "error", message: recordingUploadActionError };
  }

  return { status: "success", data: { recordingId: updated.id } };
}
