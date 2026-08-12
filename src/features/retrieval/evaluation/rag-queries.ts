export const ragEvaluationCases = [
  { id: "product-priority", question: "之前确定的产品优先级是什么？", expectedMeetingId: "product-planning", expectedChunkIndex: 0 },
  { id: "async-architecture", question: "为什么选择异步任务架构？", expectedMeetingId: "technical-review", expectedChunkIndex: 0 },
  { id: "launch-risk", question: "上线最大的风险是什么？", expectedMeetingId: "launch-risk", expectedChunkIndex: 0 },
  { id: "risk-owner", question: "谁负责解决上线风险？", expectedMeetingId: "project-management", expectedChunkIndex: 0 },
] as const;
