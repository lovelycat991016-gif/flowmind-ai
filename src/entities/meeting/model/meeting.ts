export type MeetingStatus = "complete" | "ready" | "processing" | "draft";

export type Meeting = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  participantCount: number;
  status: MeetingStatus;
};

export function formatMeetingDuration(durationMinutes: number) {
  return `${durationMinutes} min`;
}
