import { ragEvaluationCases } from "./rag-queries";

export const chineseMeetingFixture = [
  { meetingId: "product-planning", title: "产品规划会议", content: "MVP 优先完成会议创建、录音上传、转写、摘要和行动项，RAG 作为知识复用能力。" },
  { meetingId: "technical-review", title: "技术评审会议", content: "选择异步任务架构，因为转写和模型调用耗时且可能失败，不能阻塞用户请求。" },
  { meetingId: "launch-risk", title: "上线风险会议", content: "最大上线风险是 Provider 超时、服务不可用与密钥泄露，需要 timeout、retry 和 server-only secret。" },
  { meetingId: "project-management", title: "项目管理会议", content: "王敏负责处理上线风险，截止时间为本周五，并在发布前验证 Provider fallback。" },
] as const;

type Source = { meetingId: string; chunkIndex: number };
export function evaluateRagCase(testCase: (typeof ragEvaluationCases)[number], retrieved: Source[], citations: Source[]) {
  const expected = (source: Source) => source.meetingId === testCase.expectedMeetingId && source.chunkIndex === testCase.expectedChunkIndex;
  const hit = retrieved.some(expected);
  const sourceAccurate = hit;
  const citationCorrect =
    (retrieved.length === 0 || hit) &&
    citations.every((citation) =>
      retrieved.some(
        (source) =>
          source.meetingId === citation.meetingId &&
          source.chunkIndex === citation.chunkIndex,
      ),
    );
  return { hit, sourceAccurate, citationCorrect, fallback: retrieved.length === 0 };
}
