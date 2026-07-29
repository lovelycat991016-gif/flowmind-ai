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
  retrievedChunks: { meetingId: string; similarity: number }[];
  missingMeetingIds: string[];
  unsupportedMeetingIds: string[];
  providerFailure: boolean;
  retrievalCorrectness: "correct" | "incorrect" | "empty";
  thresholdFilteredCount: number;
};

export type RagQualityMetrics = {
  evaluationCount: number;
  hitRate: number;
  emptyRetrievalRate: number;
  similarityDistribution: {
    sampleCount: number;
    min: number | null;
    max: number | null;
    average: number | null;
    buckets: {
      below050: number;
      from050To079: number;
      from080To089: number;
      atLeast090: number;
    };
  };
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
  similarityThreshold: number,
): RagEvaluationResult {
  const qualifyingChunks = chunks.filter(
    (chunk) => chunk.similarity >= similarityThreshold,
  );
  const thresholdFilteredCount = chunks.length - qualifyingChunks.length;
  const retrievedMeetingIds = [
    ...new Set(qualifyingChunks.map((chunk) => chunk.meetingId)),
  ];
  const expectedMeetingIds = new Set(evaluationCase.expectedMeetingIds);
  const missingMeetingIds = evaluationCase.expectedMeetingIds.filter(
    (meetingId) => !retrievedMeetingIds.includes(meetingId),
  );
  const unsupportedMeetingIds = retrievedMeetingIds.filter(
    (meetingId) => !expectedMeetingIds.has(meetingId),
  );

  if (!qualifyingChunks.length) {
    return {
      status: "fallback",
      context: currentContext,
      retrievedMeetingIds,
      retrievedChunks: [],
      missingMeetingIds,
      unsupportedMeetingIds,
      providerFailure: false,
      retrievalCorrectness: "empty",
      thresholdFilteredCount,
    };
  }

  const retrievalCorrectness =
    missingMeetingIds.length || unsupportedMeetingIds.length
      ? "incorrect"
      : "correct";
  return {
    status: retrievalCorrectness === "correct" ? "pass" : "failed",
    context: appendSources(currentContext, qualifyingChunks),
    retrievedMeetingIds,
    retrievedChunks: qualifyingChunks.map(({ meetingId, similarity }) => ({
      meetingId,
      similarity,
    })),
    missingMeetingIds,
    unsupportedMeetingIds,
    providerFailure: false,
    retrievalCorrectness,
    thresholdFilteredCount,
  };
}

export async function runSyntheticRagEvaluation(input: {
  evaluationCase: SyntheticRagEvaluationCase;
  currentContext: string;
  similarityThreshold?: number;
  retrieve(question: string): Promise<SyntheticRagChunk[]>;
}): Promise<RagEvaluationResult> {
  try {
    const chunks = await input.retrieve(input.evaluationCase.question);
    return evaluateChunks(
      input.evaluationCase,
      input.currentContext,
      chunks,
      input.similarityThreshold ?? 0,
    );
  } catch {
    return {
      status: "fallback",
      context: input.currentContext,
      retrievedMeetingIds: [],
      retrievedChunks: [],
      missingMeetingIds: [...input.evaluationCase.expectedMeetingIds],
      unsupportedMeetingIds: [],
      providerFailure: true,
      retrievalCorrectness: "empty",
      thresholdFilteredCount: 0,
    };
  }
}

export function summarizeRagQuality(
  results: RagEvaluationResult[],
): RagQualityMetrics {
  const similarities = results.flatMap((result) =>
    result.retrievedChunks.map((chunk) => chunk.similarity),
  );
  const buckets = {
    below050: 0,
    from050To079: 0,
    from080To089: 0,
    atLeast090: 0,
  };
  for (const similarity of similarities) {
    if (similarity < 0.5) buckets.below050 += 1;
    else if (similarity < 0.8) buckets.from050To079 += 1;
    else if (similarity < 0.9) buckets.from080To089 += 1;
    else buckets.atLeast090 += 1;
  }

  return {
    evaluationCount: results.length,
    hitRate:
      results.length === 0
        ? 0
        : results.filter((result) => result.retrievalCorrectness === "correct")
            .length / results.length,
    emptyRetrievalRate:
      results.length === 0
        ? 0
        : results.filter((result) => result.retrievalCorrectness === "empty")
            .length / results.length,
    similarityDistribution: {
      sampleCount: similarities.length,
      min: similarities.length === 0 ? null : Math.min(...similarities),
      max: similarities.length === 0 ? null : Math.max(...similarities),
      average:
        similarities.length === 0
          ? null
          : Number(
              (
                similarities.reduce((total, similarity) => total + similarity, 0) /
                similarities.length
              ).toFixed(4),
            ),
      buckets,
    },
  };
}
