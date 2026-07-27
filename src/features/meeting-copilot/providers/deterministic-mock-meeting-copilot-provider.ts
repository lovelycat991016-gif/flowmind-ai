import type {
  MeetingCopilotProvider,
  MeetingCopilotRequest,
  MeetingCopilotResponse,
} from "./meeting-copilot-provider";

export class DeterministicMockMeetingCopilotProvider implements MeetingCopilotProvider {
  async generate(
    input: MeetingCopilotRequest,
  ): Promise<MeetingCopilotResponse> {
    return {
      content: `这是模拟 Copilot 回答：已收到你关于“${input.prompt}”的问题。请结合会议记录确认负责人和截止时间。`,
      provider: "mock",
    };
  }
}
