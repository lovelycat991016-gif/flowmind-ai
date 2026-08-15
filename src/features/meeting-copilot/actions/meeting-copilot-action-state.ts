import type { MeetingCopilotSource } from "@/features/meeting-copilot/context/build-meeting-copilot-context";

export type MeetingCopilotActionState = {
  status: "idle" | "error" | "success";
  message: string;
  value: string;
  sources?: MeetingCopilotSource[];
};

export const INITIAL_MEETING_COPILOT_ACTION_STATE: MeetingCopilotActionState = {
  status: "idle",
  message: "",
  value: "",
};
