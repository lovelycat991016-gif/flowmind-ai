import type {
  AIProvider,
  AIProviderMetadata,
  StructuredOutputRequest,
  TextResponseRequest,
} from "@/features/ai-providers/model/ai-provider";

export class MockProvider implements AIProvider {
  readonly metadata: AIProviderMetadata = { provider: "mock", model: null };

  async generateStructuredOutput(input: StructuredOutputRequest) {
    void input;
    return { summary: "模拟结构化结果" };
  }

  async generateTextResponse(input: TextResponseRequest) {
    return `模拟回复：${input.input}`;
  }
}
