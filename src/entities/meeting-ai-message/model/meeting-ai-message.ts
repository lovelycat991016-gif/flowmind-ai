export const meetingAiMessageRoles = ["user", "assistant"] as const;

export type MeetingAiMessageRole = (typeof meetingAiMessageRoles)[number];

export type MeetingAiMessage = {
  id: string;
  meetingId: string;
  role: MeetingAiMessageRole;
  content: string;
  createdAt: string;
};
