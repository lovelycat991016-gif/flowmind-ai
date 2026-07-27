import { NextResponse } from "next/server";

import { createMeetingIntelligenceProvider } from "@/features/ai-providers/factory/create-meeting-intelligence-provider";
import { executeNextMeetingIntelligenceWithServiceRole } from "@/features/meeting-intelligence/worker/execute-meeting-intelligence";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";

const workerId = "meeting-intelligence-cron";
const leaseSeconds = 300;

export async function GET(request: Request) {
  if (!authorizeConfiguredWorkerRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeNextMeetingIntelligenceWithServiceRole({
      workerId,
      leaseSeconds,
      provider: createMeetingIntelligenceProvider(),
    });
    return NextResponse.json({ status: result.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to process meeting intelligence." },
      { status: 500 },
    );
  }
}
