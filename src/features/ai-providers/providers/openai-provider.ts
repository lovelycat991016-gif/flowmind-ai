import type {
  AIProvider,
  AIProviderMetadata,
  StructuredOutputRequest,
  TextResponseRequest,
} from "@/features/ai-providers/model/ai-provider";
import { AIProviderError } from "@/features/ai-providers/model/ai-provider";

export class OpenAIProvider implements AIProvider {
  readonly metadata: AIProviderMetadata;

  constructor(model: string) {
    this.metadata = { provider: "openai", model };
  }

  async generateStructuredOutput(
    input: StructuredOutputRequest,
  ): Promise<unknown> {
    void input;
    throw new AIProviderError("unavailable");
  }

  async generateTextResponse(input: TextResponseRequest): Promise<string> {
    void input;
    throw new AIProviderError("unavailable");
  }
}
