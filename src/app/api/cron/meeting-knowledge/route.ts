import { NextResponse } from "next/server";

import { createEmbeddingProvider } from "@/features/embedding-providers/factory/create-embedding-provider";
import { executeNextMeetingKnowledgeJobWithServiceRole } from "@/features/meeting-knowledge/worker/execute-meeting-knowledge-job";
import { authorizeConfiguredWorkerRequest } from "@/features/transcription/worker/worker-auth";

const workerId = "meeting-knowledge-cron";
const leaseSeconds = 300;

export async function GET(request: Request) {
  if (!authorizeConfiguredWorkerRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await executeNextMeetingKnowledgeJobWithServiceRole({
      workerId,
      leaseSeconds,
      embeddingProvider: createEmbeddingProvider(),
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to process meeting knowledge." },
      { status: 500 },
    );
  }
}
