import { NextResponse } from "next/server";

import { createTranscriptionProvider } from "@/features/transcription/factory/create-transcription-provider";
import { MAX_RECORDING_FILE_SIZE_BYTES } from "@/features/recordings/schemas/recording-input";
import { executeNextTranscriptionJob } from "@/features/transcription/worker/execute-transcription-job";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";

const workerId = "transcription-cron";
const leaseSeconds = 300;

function safeErrorDiagnostic(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error };

  const redactedMessage = error.message
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(
      /\b(?:token|access[_ -]?key(?:id|secret)?|secret|authorization|cookie|signature)\b\s*(?:=|:)\s*[^\s,;]+/gi,
      (value) => `${value.split(/(?:=|:)/)[0]}=[redacted]`,
    )
    .slice(0, 500);
  const message =
    /^(?:Unable to |(?:Worker|OpenAI|FlowMind|Transcription provider) environment configuration is invalid\.)/.test(
      redactedMessage,
    )
      ? redactedMessage
      : "untrusted_error_message";

  return { name: error.name.slice(0, 100), message };
}

export async function GET(request: Request) {
  if (
    !authorizeConfiguredWorkerRequest(
      request.headers.get("authorization"),
    )
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await executeNextTranscriptionJob({
      workerId,
      leaseSeconds,
      maxInputBytes: MAX_RECORDING_FILE_SIZE_BYTES,
      provider: createTranscriptionProvider(),
    });

    return NextResponse.json({
      status: result.status,
    });
  } catch (error) {
    console.error("TRANSCRIPTION_CRON_FAILED", {
      error: safeErrorDiagnostic(error),
    });

    return NextResponse.json(
      { error: "Unable to process transcription." },
      {
        status: 500,
      },
    );
  }
}
