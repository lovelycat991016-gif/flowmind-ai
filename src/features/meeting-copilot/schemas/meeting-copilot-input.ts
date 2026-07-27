import { z } from "zod";

export const MAX_MEETING_COPILOT_PROMPT_LENGTH = 4000;

export const meetingCopilotPromptSchema = z.object({
  meetingId: z.uuid(),
  prompt: z.string().trim().min(1).max(MAX_MEETING_COPILOT_PROMPT_LENGTH),
});
