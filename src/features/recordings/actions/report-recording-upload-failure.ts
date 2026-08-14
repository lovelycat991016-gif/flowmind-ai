"use server";

import { z } from "zod";

import {
  createRecordingUploadDiagnostic,
  reportServerEvent,
} from "@/shared/observability/server";
import { createClient } from "@/shared/lib/supabase/server";

const inputSchema = z.object({
  errorCategory: z.enum([
    "network",
    "http_401",
    "http_403",
    "http_404",
    "http_409",
    "http_413",
    "other_http",
  ]),
  errorCode: z.string().regex(/^\d{3}$/).optional(),
});

export async function reportRecordingUploadFailure(input: unknown) {
  const parsed = inputSchema.safeParse(input);
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
