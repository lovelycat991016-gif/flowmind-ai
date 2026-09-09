import { afterEach, describe, expect, it, vi } from "vitest";

import { AIProviderError } from "@/features/ai-providers/model/ai-provider";
import {
  createMeetingIntelligenceProvider,
  createMeetingIntelligenceProviderFromAIProvider,
} from "./create-meeting-intelligence-provider";

const request = {
  transcriptContent: "会议文本",
  transcriptLanguage: "zh",
  promptVersion: "meeting_intelligence/v1",
};

const validOutput = {
  summary: "会议已达成发布共识",
  key_points: ["确认发布范围"],
  decisions: ["本周发布"],
  action_items: [{ task: "完成验收", owner: "李明", deadline: "2026-07-31" }],
  risks: ["验收尚未完成"],
};

function createProvider(output: unknown, model = "deepseek-chat") {
  return createMeetingIntelligenceProviderFromAIProvider({
    metadata: { provider: "deepseek", model },
    generateStructuredOutput: vi.fn().mockResolvedValue(output),
    generateTextResponse: vi.fn(),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("meeting intelligence provider factory", () => {
  it("maps generic structured output into the existing intelligence result contract", async () => {
    const generateStructuredOutput = vi.fn().mockResolvedValue(validOutput);
    const provider = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput,
      generateTextResponse: vi.fn(),
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      provider: "deepseek",
      modelIdentifier: "deepseek-chat",
      promptVersion: "meeting_intelligence/v1",
      summary: { content: "会议已达成发布共识" },
      actionItems: [
        { content: "完成验收", assigneeName: "李明", dueDate: "2026-07-31" },
      ],
    });
    expect(generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({ input: "会议文本" }),
    );
  });

  it("accepts an action item with owner omitted", async () => {
    const provider = createProvider({
      ...validOutput,
      action_items: [{ task: "完成验收", deadline: "2026-07-31" }],
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      actionItems: [
        {
          content: "完成验收",
          assigneeName: null,
          dueDate: "2026-07-31",
        },
      ],
    });
  });

  it("accepts an action item with deadline omitted", async () => {
    const provider = createProvider({
      ...validOutput,
      action_items: [{ task: "完成验收", owner: "李明" }],
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      actionItems: [
        { content: "完成验收", assigneeName: "李明", dueDate: null },
      ],
    });
  });

  it("normalizes a null action item owner to an unknown assignee", async () => {
    const provider = createProvider({
      ...validOutput,
      action_items: [{ task: "完成验收", owner: null, deadline: "2026-07-31" }],
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      actionItems: [
        {
          content: "完成验收",
          assigneeName: null,
          dueDate: "2026-07-31",
        },
      ],
    });
  });

  it("normalizes a null action item deadline to an unknown due date", async () => {
    const provider = createProvider({
      ...validOutput,
      action_items: [{ task: "完成验收", owner: "李明", deadline: null }],
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      actionItems: [
        { content: "完成验收", assigneeName: "李明", dueDate: null },
      ],
    });
  });

  it("rejects an invalid action item deadline with safe raw-schema diagnostics", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = createProvider({
      ...validOutput,
      action_items: [{ task: "完成验收", owner: "李明", deadline: "下周五" }],
    });

    await expect(provider.generate(request)).rejects.toMatchObject({
      code: "intelligence_output_invalid",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "MEETING_INTELLIGENCE_OUTPUT_INVALID",
      {
        stage: "raw_schema",
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["action_items", 0, "deadline"],
            code: expect.any(String),
          }),
        ]),
      },
    );
  });

  it.each([
    ["missing summary", { ...validOutput, summary: undefined }, ["summary"]],
    [
      "missing key_points",
      { ...validOutput, key_points: undefined },
      ["key_points"],
    ],
    [
      "missing decisions",
      { ...validOutput, decisions: undefined },
      ["decisions"],
    ],
    [
      "missing action_items",
      { ...validOutput, action_items: undefined },
      ["action_items"],
    ],
    ["missing risks", { ...validOutput, risks: undefined }, ["risks"]],
    ["empty summary", { ...validOutput, summary: "" }, ["summary"]],
    [
      "empty action item task",
      { ...validOutput, action_items: [{ task: "" }] },
      ["action_items", 0, "task"],
    ],
    ["non-object output", [], []],
  ] as const)(
    "rejects %s with safe raw-schema diagnostics",
    async (_label, output, path) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const provider = createProvider(output);

      await expect(provider.generate(request)).rejects.toMatchObject({
        code: "intelligence_output_invalid",
      });
      expect(errorSpy).toHaveBeenCalledWith(
        "MEETING_INTELLIGENCE_OUTPUT_INVALID",
        {
          stage: "raw_schema",
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: [...path],
              code: expect.any(String),
            }),
          ]),
        },
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
        "会议已达成发布共识",
      );
    },
  );

  it("reports durable-schema failures without logging model output", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = createProvider(validOutput, "");

    await expect(provider.generate(request)).rejects.toMatchObject({
      code: "intelligence_output_invalid",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "MEETING_INTELLIGENCE_OUTPUT_INVALID",
      {
        stage: "durable_schema",
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ["modelIdentifier"],
            code: expect.any(String),
          }),
        ]),
      },
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "会议已达成发布共识",
    );
  });

  it("maps malformed output and provider timeout to existing safe worker failure codes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const invalid = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi.fn().mockResolvedValue({ summary: "" }),
      generateTextResponse: vi.fn(),
    });
    const timedOut = createMeetingIntelligenceProviderFromAIProvider({
      metadata: { provider: "deepseek", model: "deepseek-chat" },
      generateStructuredOutput: vi
        .fn()
        .mockRejectedValue(new AIProviderError("timeout")),
      generateTextResponse: vi.fn(),
    });

    await expect(invalid.generate(request)).rejects.toEqual(
      expect.objectContaining({ code: "intelligence_output_invalid" }),
    );
    await expect(timedOut.generate(request)).rejects.toEqual(
      expect.objectContaining({ code: "provider_timeout" }),
    );
  });

  it("uses the configured provider factory when no provider is injected", () => {
    expect(createMeetingIntelligenceProvider).toBeDefined();
  });
});
