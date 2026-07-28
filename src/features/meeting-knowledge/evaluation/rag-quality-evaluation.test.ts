import { describe, expect, it } from "vitest";

import {
  runSyntheticRagEvaluation,
  syntheticRagEvaluationCases,
  syntheticRagMeetings,
} from "./rag-quality-evaluation";

const riskCase = syntheticRagEvaluationCases.find(
  (evaluationCase) => evaluationCase.id === "historical-risks",
);

if (!riskCase) throw new Error("Missing synthetic risk evaluation case.");

describe("synthetic RAG quality evaluation", () => {
  it("covers project, technical, product, and risk discussion meetings", () => {
    expect(syntheticRagMeetings.map((meeting) => meeting.type)).toEqual([
      "project_weekly",
      "technical_review",
      "product_requirements",
      "risk_discussion",
    ]);
  });

  it("accepts relevant risk chunks and requires their cited sources", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "当前会议上下文",
      retrieve: async () =>
        syntheticRagMeetings
          .filter((meeting) => meeting.type !== "product_requirements")
          .flatMap((meeting) => meeting.chunks),
    });

    expect(result.status).toBe("pass");
    expect(result.missingMeetingIds).toEqual([]);
    expect(result.unsupportedMeetingIds).toEqual([]);
    expect(result.context).toContain("历史会议来源");
    expect(result.context).toContain("[project-weekly]");
    expect(result.context).toContain("[technical-review]");
    expect(result.context).toContain("[risk-discussion]");
  });

  it("falls back to the current meeting context for empty knowledge", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "当前会议上下文",
      retrieve: async () => [],
    });

    expect(result.status).toBe("fallback");
    expect(result.providerFailure).toBe(false);
    expect(result.context).toBe("当前会议上下文");
    expect(result.context).not.toContain("历史会议来源");
  });

  it("rejects a wrong meeting context as unsupported evidence", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "当前会议上下文",
      retrieve: async () =>
        syntheticRagMeetings
          .filter((meeting) => meeting.type === "product_requirements")
          .flatMap((meeting) => meeting.chunks),
    });

    expect(result.status).toBe("failed");
    expect(result.unsupportedMeetingIds).toEqual(["product-requirements"]);
    expect(result.context).not.toContain("[project-weekly]");
  });

  it("falls back without provider details when retrieval fails", async () => {
    const result = await runSyntheticRagEvaluation({
      evaluationCase: riskCase,
      currentContext: "当前会议上下文",
      retrieve: async () => {
        throw new Error("provider secret and private meeting text");
      },
    });

    expect(result).toMatchObject({
      status: "fallback",
      providerFailure: true,
      context: "当前会议上下文",
      retrievedMeetingIds: [],
    });
    expect(JSON.stringify(result)).not.toContain("provider secret");
    expect(JSON.stringify(result)).not.toContain("private meeting text");
  });
});
