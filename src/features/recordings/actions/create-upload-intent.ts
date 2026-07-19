"use server";

import { redirect } from "next/navigation";

import { recordingUploadMetadataSchema } from "@/features/recordings/schemas/recording-input";
import { createClient } from "@/shared/lib/supabase/server";

import {
  type RecordingActionResult,
  recordingUploadActionError,
} from "./recording-action-state";

type UploadIntent = {
  recordingId: string;
  signedUrl: string;
  storagePath: string;
};

function extensionFor(filename: string, mimeType: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{1,10}$/.test(extension)) return extension;

  return {
    "audio/mpeg": "mp3",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/webm": "webm",
  }[mimeType] ?? "audio";
}

export async function createUploadIntent(
  input: unknown,
): Promise<RecordingActionResult<UploadIntent>> {
  const parsed = recordingUploadMetadataSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: recordingUploadActionError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("id")
    .eq("id", parsed.data.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (meetingError || !meeting) {
    return { status: "error", message: recordingUploadActionError };
  }

  const recordingId = crypto.randomUUID();
  const storagePath = `${user.id}/${parsed.data.meetingId}/${recordingId}.${extensionFor(
    parsed.data.filename,
    parsed.data.mimeType,
  )}`;
  const { data: recording, error: insertError } = await supabase
    .from("recordings")
    .insert({
      id: recordingId,
      meeting_id: parsed.data.meetingId,
      user_id: user.id,
      storage_path: storagePath,
      original_filename: parsed.data.filename,
      mime_type: parsed.data.mimeType,
      file_size_bytes: parsed.data.fileSizeBytes,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !recording) {
    return { status: "error", message: recordingUploadActionError };
  }

  const { data: signedUpload, error: signedUploadError } = await supabase.storage
    .from("recordings")
    .createSignedUploadUrl(storagePath);
  if (signedUploadError || !signedUpload?.signedUrl) {
    await supabase
      .from("recordings")
      .update({ status: "failed" })
      .eq("id", recordingId);
    return { status: "error", message: recordingUploadActionError };
  }

  const { error: transitionError } = await supabase
    .from("recordings")
    .update({ status: "uploading" })
    .eq("id", recordingId)
    .eq("user_id", user.id);
  if (transitionError) {
    return { status: "error", message: recordingUploadActionError };
  }

  return {
    status: "success",
    data: { recordingId, signedUrl: signedUpload.signedUrl, storagePath },
  };
}
