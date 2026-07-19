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

function storageLocation(path: string) {
  const separator = path.lastIndexOf("/");
  return {
    folder: path.slice(0, separator),
    name: path.slice(separator + 1),
  };
}

async function ensureProcessingJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recordingId: string,
  userId: string,
) {
  const { data: activeJob, error: activeJobError } = await supabase
    .from("processing_jobs")
    .select("id")
    .eq("recording_id", recordingId)
    .eq("user_id", userId)
    .in("status", ["queued", "running"])
    .maybeSingle();
  if (activeJobError) return false;
  if (activeJob) return true;

  const { data: createdJob, error: createJobError } = await supabase
    .from("processing_jobs")
    .insert({
      recording_id: recordingId,
      user_id: userId,
      status: "queued",
      attempt_count: 0,
    })
    .select("id")
    .single();

  return !createJobError && Boolean(createdJob);
}

export async function finalizeUpload(
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
    .select(
      "id,meeting_id,storage_bucket,storage_path,status,meetings!inner(id)",
    )
    .eq("id", parsed.data.recordingId)
    .eq("user_id", user.id)
    .eq("meetings.user_id", user.id)
    .maybeSingle();
  if (recordingError || !recording) {
    return { status: "error", message: recordingUploadActionError };
  }

  if (recording.status !== "uploaded") {
    const transition = recordingLifecycleTransitionSchema.safeParse({
      from: recording.status,
      to: "uploaded",
    });
    if (!transition.success) {
      return { status: "error", message: recordingUploadActionError };
    }

    const location = storageLocation(recording.storage_path);
    const { data: objects, error: objectError } = await supabase.storage
      .from(recording.storage_bucket)
      .list(location.folder, { limit: 1, search: location.name });
    const objectExists = objects?.some(
      (object) => object.name === location.name,
    );
    if (objectError || !objectExists) {
      await supabase
        .from("recordings")
        .update({ status: "failed" })
        .eq("id", recording.id)
        .eq("user_id", user.id);
      return { status: "error", message: recordingUploadActionError };
    }

    const { data: updated, error: updateError } = await supabase
      .from("recordings")
      .update({ status: "uploaded", uploaded_at: new Date().toISOString() })
      .eq("id", recording.id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (updateError || !updated) {
      return { status: "error", message: recordingUploadActionError };
    }
  }

  const processingJobCreated = await ensureProcessingJob(
    supabase,
    recording.id,
    user.id,
  );
  if (!processingJobCreated) {
    return { status: "error", message: recordingUploadActionError };
  }

  return { status: "success", data: { recordingId: recording.id } };
}
