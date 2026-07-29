import { describe, expect, it } from "vitest";

import {
  runSyntheticRagEvaluation,
  summarizeRagQuality,
  syntheticRagEvaluationCases,
} from "./rag-quality-evaluation";

const riskCase = syntheticRagEvaluationCases.find(
  (evaluationCase) => evaluationCase.id === "historical-risks",
);

if (!riskCase) throw new Error("Missing synthetic risk evaluation case.");

describe("RAG quality metrics", () => {
  it("uses expected sources and similarity scores to classify correct retrieval", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "current meeting",
      similarityThreshold: 0.8,
      retrieve: async () => [
        { meetingId: "project-weekly", content: "source one", similarity: 0.98 },
        { meetingId: "technical-review", content: "source two", similarity: 0.95 },
        { meetingId: "risk-discussion", content: "source three", similarity: 0.92 },
      ],
    });

    expect(result.retrievalCorrectness).toBe("correct");
    expect(result.retrievedChunks).toEqual([
      { meetingId: "project-weekly", similarity: 0.98 },
      { meetingId: "technical-review", similarity: 0.95 },
      { meetingId: "risk-discussion", similarity: 0.92 },
    ]);
  });

  it("falls back when every retrieved source is below the evaluation threshold", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "current meeting",
      similarityThreshold: 0.8,
      retrieve: async () => [
        { meetingId: "project-weekly", content: "low confidence", similarity: 0.79 },
      ],
    });

    expect(result).toMatchObject({
      status: "fallback",
      retrievalCorrectness: "empty",
      thresholdFilteredCount: 1,
      context: "current meeting",
    });
  });

  it("reports hit rate, empty retrieval rate, and a privacy-safe similarity distribution", async () => {
    const correct = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "private current context",
      retrieve: async () => [
        { meetingId: "project-weekly", content: "private source one", similarity: 0.98 },
        { meetingId: "technical-review", content: "private source two", similarity: 0.95 },
        { meetingId: "risk-discussion", content: "private source three", similarity: 0.92 },
      ],
    });
    const empty = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "private current context",
      retrieve: async () => [],
    });

    const metrics = summarizeRagQuality([correct, empty]);

    expect(metrics).toEqual({
      evaluationCount: 2,
      hitRate: 0.5,
      emptyRetrievalRate: 0.5,
      similarityDistribution: {
        sampleCount: 3,
        min: 0.92,
        max: 0.98,
        average: 0.95,
        buckets: {
          below050: 0,
          from050To079: 0,
          from080To089: 0,
          atLeast090: 3,
        },
      },
    });
    expect(JSON.stringify(metrics)).not.toContain("private current context");
    expect(JSON.stringify(metrics)).not.toContain("private source");
  });
});
