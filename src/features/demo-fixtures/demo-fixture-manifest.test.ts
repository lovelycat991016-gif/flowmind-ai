import { describe, expect, it } from "vitest";

import { demoFixtureManifest } from "./demo-fixture-manifest";

describe("demo fixture manifest", () => {
  it("defines three stable synthetic Chinese meeting fixtures", () => {
    expect(demoFixtureManifest.user.email).toBe("demo.flowmind@example.test");
    expect(demoFixtureManifest.meetings.map((meeting) => meeting.title)).toEqual([
      "产品规划会议：FlowMind Demo 范围",
      "技术评审会议：检索与引用方案",
      "风险讨论会议：预览环境发布",
    ]);

    for (const meeting of demoFixtureManifest.meetings) {
      expect(meeting.transcript.content).toMatch(/产品|技术|风险|发布/);
      expect(meeting.transcript.segments.length).toBeGreaterThan(0);
      expect(meeting.intelligence.summary).not.toHaveLength(0);
      expect(meeting.actionItems.length).toBeGreaterThan(0);
      expect(meeting.knowledgeChunks.length).toBeGreaterThan(0);
    }
  });

  it("defines deterministic expected RAG sources without embedding vectors", () => {
    expect(demoFixtureManifest.expectedRagSources).toEqual([
      {
        question: "之前会议讨论过哪些发布风险？",
        meetingIds: ["10000000-0000-4000-8000-000000000003"],
      },
      {
        question: "技术方案最终选择了什么？",
        meetingIds: ["10000000-0000-4000-8000-000000000002"],
      },
    ]);
    expect(JSON.stringify(demoFixtureManifest)).not.toContain("embedding");
  });
});
