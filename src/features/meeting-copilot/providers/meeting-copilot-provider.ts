export type MeetingCopilotRequest = {
  meetingId: string;
  meetingTitle: string;
  prompt: string;
};

export type MeetingCopilotResponse = {
  content: string;
  provider: "mock";
};

export interface MeetingCopilotProvider {
  generate(input: MeetingCopilotRequest): Promise<MeetingCopilotResponse>;
}
