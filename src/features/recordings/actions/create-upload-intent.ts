"use server";

import { redirect } from "next/navigation";

import { recordingUploadMetadataSchema } from "@/features/recordings/schemas/recording-input";
import {
  createRecordingUploadDiagnostic,
  recordingUploadErrorCode,
  reportServerEvent,
  type RecordingUploadErrorCategory,
  type RecordingUploadStage,
} from "@/shared/observability/server";
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

function reportUploadIntentFailure(input: {
  stage: RecordingUploadStage;
  errorCategory: RecordingUploadErrorCategory;
  error?: unknown;
  authenticatedUserPresent: boolean;
}) {
  reportServerEvent({
    category: input.errorCategory === "storage" ? "storage" : "supabase",
    operation: "recording_upload_intent",
    outcome: "failure",
    failureCode:
      input.errorCategory === "storage"
        ? "storage_operation_failed"
        : input.errorCategory === "supabase_query"
          ? "supabase_query_failed"
          : "supabase_mutation_failed",
    recordingUploadDiagnostic: createRecordingUploadDiagnostic({
      stage: input.stage,
      errorCategory: input.errorCategory,
      ...(recordingUploadErrorCode(input.error)
        ? { errorCode: recordingUploadErrorCode(input.error) }
        : {}),
      authenticatedUserPresent: input.authenticatedUserPresent,
    }),
  });
}

function extensionFor(filename: string, mimeType: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{1,10}$/.test(extension)) return extension;

  return (
    {
      "audio/mpeg": "mp3",
      "audio/mp4": "mp4",
      "audio/wav": "wav",
      "audio/webm": "webm",
    }[mimeType] ?? "audio"
  );
}

export async function createUploadIntent(
  input: unknown,
): Promise<RecordingActionResult<UploadIntent>> {
  const parsed = recordingUploadMetadataSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error", message: recordingUploadActionError };

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
    reportUploadIntentFailure({
      stage: "intent_meeting_lookup",
      errorCategory: "supabase_query",
      error: meetingError,
      authenticatedUserPresent: Boolean(user),
    });
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
    reportUploadIntentFailure({
      stage: "intent_recording_insert",
      errorCategory: "supabase_mutation",
      error: insertError,
      authenticatedUserPresent: Boolean(user),
    });
    return { status: "error", message: recordingUploadActionError };
  }

  const { data: signedUpload, error: signedUploadError } =
    await supabase.storage
      .from("recordings")
      .createSignedUploadUrl(storagePath);
  if (signedUploadError || !signedUpload?.signedUrl) {
    reportUploadIntentFailure({
      stage: "intent_signed_url",
      errorCategory: "storage",
      error: signedUploadError,
      authenticatedUserPresent: Boolean(user),
    });
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
    reportUploadIntentFailure({
      stage: "intent_status_update",
      errorCategory: "supabase_mutation",
      error: transitionError,
      authenticatedUserPresent: Boolean(user),
    });
    return { status: "error", message: recordingUploadActionError };
  }

  return {
    status: "success",
    data: { recordingId, signedUrl: signedUpload.signedUrl, storagePath },
  };
}
