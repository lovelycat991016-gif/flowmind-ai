export type SyntheticRagChunk = {
  meetingId: string;
  content: string;
  similarity: number;
};

export type SyntheticRagMeeting = {
  id: string;
  type:
    | "project_weekly"
    | "technical_review"
    | "product_requirements"
    | "risk_discussion";
  title: string;
  chunks: SyntheticRagChunk[];
};

export type SyntheticRagEvaluationCase = {
  id: string;
  question: string;
  expectedMeetingIds: string[];
};

export const syntheticRagMeetings: SyntheticRagMeeting[] = [
  {
    id: "project-weekly",
    type: "project_weekly",
    title: "项目周会",
    chunks: [
      {
        meetingId: "project-weekly",
        content: "项目周会：供应商交付预计延迟两周，可能影响八月发布计划。",
        similarity: 0.98,
      },
    ],
  },
  {
    id: "technical-review",
    type: "technical_review",
    title: "技术评审",
    chunks: [
      {
        meetingId: "technical-review",
        content: "技术评审：登录接口在高并发下的 P95 延迟是上线风险，需要压测后决定。",
        similarity: 0.95,
      },
    ],
  },
  {
    id: "product-requirements",
    type: "product_requirements",
    title: "产品需求会议",
    chunks: [
      {
        meetingId: "product-requirements",
        content: "产品需求会议：确认新用户引导的页面范围和验收负责人。",
        similarity: 0.42,
      },
    ],
  },
  {
    id: "risk-discussion",
    type: "risk_discussion",
    title: "风险讨论会议",
    chunks: [
      {
        meetingId: "risk-discussion",
        content: "风险讨论会议：第三方身份服务的限流与预算审批延迟需要制定备用方案。",
        similarity: 0.92,
      },
    ],
  },
];

export const syntheticRagEvaluationCases: SyntheticRagEvaluationCase[] = [
  {
    id: "historical-risks",
    question: "之前会议讨论过哪些风险？",
    expectedMeetingIds: [
      "project-weekly",
      "technical-review",
      "risk-discussion",
    ],
  },
];

export type RagEvaluationResult = {
  status: "pass" | "failed" | "fallback";
  context: string;
  retrievedMeetingIds: string[];
  missingMeetingIds: string[];
  unsupportedMeetingIds: string[];
  providerFailure: boolean;
};

function appendSources(currentContext: string, chunks: SyntheticRagChunk[]) {
  if (!chunks.length) return currentContext;
  return `${currentContext}\n\n历史会议来源\n${chunks
    .map((chunk) => `- [${chunk.meetingId}] ${chunk.content}`)
    .join("\n")}`;
}

function evaluateChunks(
  evaluationCase: SyntheticRagEvaluationCase,
  currentContext: string,
  chunks: SyntheticRagChunk[],
): RagEvaluationResult {
  const retrievedMeetingIds = [...new Set(chunks.map((chunk) => chunk.meetingId))];
  const expectedMeetingIds = new Set(evaluationCase.expectedMeetingIds);
  const missingMeetingIds = evaluationCase.expectedMeetingIds.filter(
    (meetingId) => !retrievedMeetingIds.includes(meetingId),
  );
  const unsupportedMeetingIds = retrievedMeetingIds.filter(
    (meetingId) => !expectedMeetingIds.has(meetingId),
  );

  if (!chunks.length) {
    return {
      status: "fallback",
      context: currentContext,
      retrievedMeetingIds,
      missingMeetingIds,
      unsupportedMeetingIds,
      providerFailure: false,
    };
  }

  return {
    status:
      missingMeetingIds.length || unsupportedMeetingIds.length ? "failed" : "pass",
    context: appendSources(currentContext, chunks),
    retrievedMeetingIds,
    missingMeetingIds,
    unsupportedMeetingIds,
    providerFailure: false,
  };
}

export async function runSyntheticRagEvaluation(input: {
  evaluationCase: SyntheticRagEvaluationCase;
  currentContext: string;
  retrieve(question: string): Promise<SyntheticRagChunk[]>;
}): Promise<RagEvaluationResult> {
  try {
    const chunks = await input.retrieve(input.evaluationCase.question);
    return evaluateChunks(input.evaluationCase, input.currentContext, chunks);
  } catch {
    return {
      status: "fallback",
      context: input.currentContext,
      retrievedMeetingIds: [],
      missingMeetingIds: [...input.evaluationCase.expectedMeetingIds],
      unsupportedMeetingIds: [],
      providerFailure: true,
    };
  }
}
