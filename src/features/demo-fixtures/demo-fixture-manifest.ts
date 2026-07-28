export type DemoFixtureMeeting = {
  id: string;
  title: string;
  meetingDate: string;
  transcript: {
    id: string;
    content: string;
    segments: Array<{ index: number; startMs: number; endMs: number; content: string }>;
  };
  intelligence: {
    summary: string;
    decisions: string[];
    risks: string[];
  };
  actionItems: Array<{ id: string; title: string; owner: string; dueDate: string }>;
  knowledgeChunks: Array<{ id: string; content: string; sourceHash: string }>;
};

export type DemoFixtureManifest = {
  user: { email: string; fullName: string };
  meetings: DemoFixtureMeeting[];
  expectedRagSources: Array<{ question: string; meetingIds: string[] }>;
};

export const demoFixtureManifest: DemoFixtureManifest = {
  user: {
    email: "demo.flowmind@example.test",
    fullName: "FlowMind 演示用户",
  },
  meetings: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      title: "产品规划会议：FlowMind Demo 范围",
      meetingDate: "2026-07-01T09:00:00.000Z",
      transcript: {
        id: "20000000-0000-4000-8000-000000000001",
        content: "产品团队确认 Demo 聚焦会议总结、行动项和知识库问答。",
        segments: [
          { index: 0, startMs: 0, endMs: 12000, content: "产品团队确认 Demo 聚焦会议总结。" },
          { index: 1, startMs: 12000, endMs: 24000, content: "行动项由王敏跟进演示脚本。" },
        ],
      },
      intelligence: {
        summary: "确定 Demo 聚焦会议总结、行动项和知识库问答。",
        decisions: ["优先展示可解释的 AI 结果。"],
        risks: ["演示数据需要可重复初始化。"],
      },
      actionItems: [
        { id: "30000000-0000-4000-8000-000000000001", title: "整理演示脚本", owner: "王敏", dueDate: "2026-07-05" },
      ],
      knowledgeChunks: [
        { id: "40000000-0000-4000-8000-000000000001", content: "Demo 聚焦会议总结、行动项和知识库问答。", sourceHash: "demo-product-plan-v1" },
      ],
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      title: "技术评审会议：检索与引用方案",
      meetingDate: "2026-07-08T09:00:00.000Z",
      transcript: {
        id: "20000000-0000-4000-8000-000000000002",
        content: "技术团队决定使用 owner scoped 检索，并在 Copilot 中展示会议来源。",
        segments: [
          { index: 0, startMs: 0, endMs: 12000, content: "技术团队决定使用 owner scoped 检索。" },
          { index: 1, startMs: 12000, endMs: 24000, content: "Copilot 必须展示会议来源和片段。" },
        ],
      },
      intelligence: {
        summary: "确定检索结果必须遵守 owner scoped 边界并展示来源。",
        decisions: ["采用现有向量检索 RPC。"],
        risks: ["无索引时不能伪造历史来源。"],
      },
      actionItems: [
        { id: "30000000-0000-4000-8000-000000000002", title: "定义来源引用样式", owner: "李晨", dueDate: "2026-07-12" },
      ],
      knowledgeChunks: [
        { id: "40000000-0000-4000-8000-000000000002", content: "最终选择 owner scoped 检索，并在 Copilot 中展示会议来源。", sourceHash: "demo-technical-review-v1" },
      ],
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      title: "风险讨论会议：预览环境发布",
      meetingDate: "2026-07-15T09:00:00.000Z",
      transcript: {
        id: "20000000-0000-4000-8000-000000000003",
        content: "团队识别预览环境配置、真实嵌入服务和演示数据污染三个发布风险。",
        segments: [
          { index: 0, startMs: 0, endMs: 12000, content: "预览环境必须与生产数据隔离。" },
          { index: 1, startMs: 12000, endMs: 24000, content: "无嵌入索引时要明确提示知识库不可用。" },
        ],
      },
      intelligence: {
        summary: "预览发布必须隔离数据，并清楚展示知识库降级。",
        decisions: ["Fixture runner 禁止连接生产项目。"],
        risks: ["真实嵌入服务未配置时 RAG 不能作为生产能力承诺。"],
      },
      actionItems: [
        { id: "30000000-0000-4000-8000-000000000003", title: "验证预览环境保护", owner: "陈雨", dueDate: "2026-07-18" },
      ],
      knowledgeChunks: [
        { id: "40000000-0000-4000-8000-000000000003", content: "发布风险包括预览环境隔离、嵌入索引不可用和演示数据污染。", sourceHash: "demo-risk-review-v1" },
      ],
    },
  ],
  expectedRagSources: [
    { question: "之前会议讨论过哪些发布风险？", meetingIds: ["10000000-0000-4000-8000-000000000003"] },
    { question: "技术方案最终选择了什么？", meetingIds: ["10000000-0000-4000-8000-000000000002"] },
  ],
};
