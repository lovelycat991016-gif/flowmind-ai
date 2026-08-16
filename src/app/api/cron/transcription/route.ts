import { NextResponse } from "next/server";

import { createTranscriptionProvider } from "@/features/transcription/factory/create-transcription-provider";
import { MAX_RECORDING_FILE_SIZE_BYTES } from "@/features/recordings/schemas/recording-input";
import { executeNextTranscriptionJob } from "@/features/transcription/worker/execute-transcription-job";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";

const workerId = "transcription-cron";
const leaseSeconds = 300;

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
    console.error("transcription cron failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process transcription.",
      },
      {
        status: 500,
      },
    );
  }
}