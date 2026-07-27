import { createAIProviderFromEnvironment } from "@/features/ai-providers/factory/create-ai-provider";
import type { AIProvider } from "@/features/ai-providers/model/ai-provider";
import type {
  MeetingCopilotProvider,
  MeetingCopilotRequest,
  MeetingCopilotResponse,
} from "@/features/meeting-copilot/providers/meeting-copilot-provider";
import { buildMeetingCopilotPrompt } from "@/features/ai-providers/prompts/meeting-copilot-prompt";

class FactoryMeetingCopilotProvider implements MeetingCopilotProvider {
  constructor(private readonly provider: AIProvider) {}

  async generate(
    request: MeetingCopilotRequest,
  ): Promise<MeetingCopilotResponse> {
    try {
      const prompt = buildMeetingCopilotPrompt({
        meetingTitle: request.meetingTitle,
        context: request.context,
        question: request.prompt,
      });
      const content = await this.provider.generateTextResponse({
        system: prompt.system,
        input: prompt.input,
      });
      if (!content.trim()) throw new Error("Empty meeting Copilot response.");
      return {
        content: content.trim(),
        provider: this.provider.metadata.provider,
      };
    } catch {
      throw new Error("Unable to generate meeting Copilot response.");
    }
  }
}

export function createMeetingCopilotProviderFromAIProvider(
  provider: AIProvider,
): MeetingCopilotProvider {
  return new FactoryMeetingCopilotProvider(provider);
}

export function createMeetingCopilotProvider(): MeetingCopilotProvider {
  return createMeetingCopilotProviderFromAIProvider(
    createAIProviderFromEnvironment(),
  );
}
