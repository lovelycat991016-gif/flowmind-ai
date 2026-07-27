import type { AIProviderId } from "@/features/ai-providers/model/ai-provider";

export type MeetingCopilotRequest = {
  meetingId: string;
  meetingTitle: string;
  prompt: string;
  context: string;
};

export type MeetingCopilotResponse = {
  content: string;
  provider: AIProviderId;
  modelIdentifier?: string | null;
};

export interface MeetingCopilotProvider {
  generate(input: MeetingCopilotRequest): Promise<MeetingCopilotResponse>;
}
