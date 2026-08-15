"use server";

import { recordingUploadFailureSchema } from "@/features/recordings/model/recording-upload-diagnostic-schema";
import {
  createRecordingUploadDiagnostic,
  reportServerEvent,
} from "@/shared/observability/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function reportRecordingUploadFailure(input: unknown) {
  const parsed = recordingUploadFailureSchema.safeParse(input);
  if (!parsed.success) return;

  let authenticatedUserPresent = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    authenticatedUserPresent = Boolean(data.user);
  } catch {
    // Diagnostic reporting must not change upload recovery behavior.
  }

  reportServerEvent({
    category: "storage",
    operation: "recording_upload_intent",
    outcome: "failure",
    failureCode: "storage_operation_failed",
    recordingUploadDiagnostic: createRecordingUploadDiagnostic({
      stage: "direct_upload",
      ...parsed.data,
      authenticatedUserPresent,
    }),
  });
}
