import { NextResponse } from "next/server";

import { OpenAIMeetingIntelligenceProvider } from "@/features/meeting-intelligence/providers/openai-meeting-intelligence-provider";
import { executeNextMeetingIntelligenceWithServiceRole } from "@/features/meeting-intelligence/worker/execute-meeting-intelligence";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";
import { getOpenAIEnv } from "@/shared/config/openai-env";

const workerId = "meeting-intelligence-cron";
const leaseSeconds = 300;

export async function GET(request: Request) {
  if (!authorizeConfiguredWorkerRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiKey, model } = getOpenAIEnv();
    const result = await executeNextMeetingIntelligenceWithServiceRole({
      workerId,
      leaseSeconds,
      provider: new OpenAIMeetingIntelligenceProvider({ apiKey, model }),
    });
    return NextResponse.json({ status: result.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to process meeting intelligence." },
      { status: 500 },
    );
  }
}
