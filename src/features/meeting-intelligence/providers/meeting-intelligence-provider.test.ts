import { describe, expect, it, vi } from "vitest";

import { StructuredMeetingIntelligenceProvider } from "./structured-meeting-intelligence-provider";

const request = {
  transcriptContent: "项目按计划推进。",
  transcriptLanguage: "zh",
  promptVersion: "meeting_intelligence/v1",
};
const output = {
  provider: "test-provider",
  modelIdentifier: "test-model",
  promptVersion: request.promptVersion,
  summary: { content: "项目按计划推进。" },
  keyPoints: ["本周完成测试"],
  actionItems: [],
  decisions: [],
  risks: [],
  outputMetadata: { schemaVersion: "v1" },
};

describe("StructuredMeetingIntelligenceProvider", () => {
  it("maps an injected structured response into the provider-neutral result", async () => {
    const transport = vi.fn().mockResolvedValue(JSON.stringify(output));
    const provider = new StructuredMeetingIntelligenceProvider({ transport });

    await expect(provider.generate(request)).resolves.toEqual(output);
    expect(transport).toHaveBeenCalledWith(request);
  });

  it("rejects malformed JSON and invalid structured output safely", async () => {
    const malformed = new StructuredMeetingIntelligenceProvider({
      transport: vi.fn().mockResolvedValue("not-json"),
    });
    const invalid = new StructuredMeetingIntelligenceProvider({
      transport: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ ...output, summary: {} })),
    });

    await expect(malformed.generate(request)).rejects.toMatchObject({
      code: "intelligence_output_invalid",
    });
    await expect(invalid.generate(request)).rejects.toMatchObject({
      code: "intelligence_output_invalid",
    });
  });

  it("maps timeout and transport failures to safe generation errors", async () => {
    const timeout = new StructuredMeetingIntelligenceProvider({
      transport: vi
        .fn()
        .mockRejectedValue(new DOMException("aborted", "AbortError")),
    });
    const unavailable = new StructuredMeetingIntelligenceProvider({
      transport: vi
        .fn()
        .mockRejectedValue(new Error("provider internal detail")),
    });

    await expect(timeout.generate(request)).rejects.toMatchObject({
      code: "provider_timeout",
    });
    await expect(unavailable.generate(request)).rejects.toMatchObject({
      code: "provider_request_failed",
    });
  });
});
