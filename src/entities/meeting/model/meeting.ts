export type MeetingListItem = {
  id: string;
  title: string;
  meetingDate: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeetingDetail = MeetingListItem;

export type MeetingPage = {
  meetings: ReadonlyArray<MeetingListItem>;
  hasNextPage: boolean;
};

export type DashboardMeetingMetrics = {
  total: number;
  active: number;
  archived: number;
  thisWeek: number;
};

export type DashboardMeetingData = {
  metrics: DashboardMeetingMetrics;
  recentMeetings: ReadonlyArray<MeetingListItem>;
};

// Sprint 2 dashboard compatibility. Removed when Task 9 switches to live meeting props.
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

export type MeetingRow = {
  id: string;
  title: string;
  meeting_date: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapMeetingRow(row: MeetingRow): MeetingListItem {
  return {
    id: row.id,
    title: row.title,
    meetingDate: row.meeting_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatMeetingDate(value: string, locale = "zh-CN") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMeetingDuration(durationMinutes: number) {
  return `${durationMinutes} min`;
}
