import { NextResponse } from "next/server";

import { OpenAIWhisperTranscriptionProvider } from "@/features/transcription/providers/openai-whisper-provider";
import { MAX_RECORDING_FILE_SIZE_BYTES } from "@/features/recordings/schemas/recording-input";
import { executeNextTranscriptionJob } from "@/features/transcription/worker/execute-transcription-job";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";
import { getOpenAIEnv } from "@/shared/config/openai-env";

const workerId = "transcription-cron";
const leaseSeconds = 300;

export async function GET(request: Request) {
  if (!authorizeConfiguredWorkerRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey } = getOpenAIEnv();
    const result = await executeNextTranscriptionJob({
      workerId,
      leaseSeconds,
      maxInputBytes: MAX_RECORDING_FILE_SIZE_BYTES,
      provider: new OpenAIWhisperTranscriptionProvider({ apiKey }),
    });
    return NextResponse.json({ status: result.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to process transcription." },
      { status: 500 },
    );
  }
}
