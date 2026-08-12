import { describe, expect, it } from "vitest";

import { ragEvaluationCases } from "./rag-queries";
import { evaluateRagCase } from "./rag-fixture";

describe("Chinese RAG evaluation fixture", () => {
  it("accepts a retrieval result only when it includes the expected source", () => {
    const testCase = ragEvaluationCases[0];
    expect(evaluateRagCase(testCase, [{ meetingId: testCase.expectedMeetingId, chunkIndex: testCase.expectedChunkIndex }], [{ meetingId: testCase.expectedMeetingId, chunkIndex: testCase.expectedChunkIndex }])).toEqual({ hit: true, sourceAccurate: true, citationCorrect: true, fallback: false });
  });

  it("rejects a wrong source and treats empty or failed retrieval as fallback", () => {
    const testCase = ragEvaluationCases[1];
    expect(evaluateRagCase(testCase, [{ meetingId: "wrong", chunkIndex: 0 }], [{ meetingId: "wrong", chunkIndex: 0 }])).toMatchObject({ hit: false, sourceAccurate: false, citationCorrect: false });
    expect(evaluateRagCase(testCase, [], [])).toEqual({ hit: false, sourceAccurate: false, citationCorrect: true, fallback: true });
  });
});
