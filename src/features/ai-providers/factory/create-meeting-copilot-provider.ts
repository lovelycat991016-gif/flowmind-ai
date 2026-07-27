import { createAIProviderFromEnvironment } from "@/features/ai-providers/factory/create-ai-provider";
import type { AIProvider } from "@/features/ai-providers/model/ai-provider";
import type {
  MeetingCopilotProvider,
  MeetingCopilotRequest,
  MeetingCopilotResponse,
} from "@/features/meeting-copilot/providers/meeting-copilot-provider";

function systemInstruction() {
  return "You are FlowMind Meeting Copilot. Answer in Chinese using only the supplied meeting context. If the context does not contain the answer, say so plainly. Never invent meeting facts.";
}

function inputFor(request: MeetingCopilotRequest) {
  return `Meeting title: ${request.meetingTitle}\n\nMeeting context:\n${request.context}\n\nUser question: ${request.prompt}`;
}

class FactoryMeetingCopilotProvider implements MeetingCopilotProvider {
  constructor(private readonly provider: AIProvider) {}

  async generate(
    request: MeetingCopilotRequest,
  ): Promise<MeetingCopilotResponse> {
    try {
      const content = await this.provider.generateTextResponse({
        system: systemInstruction(),
        input: inputFor(request),
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
