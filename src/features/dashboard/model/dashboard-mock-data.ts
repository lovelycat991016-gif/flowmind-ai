import type { Meeting } from "@/entities/meeting/model/meeting";

export type StatisticTone = "success" | "info" | "warning" | "neutral";
export type StatisticIcon = "meetings" | "time" | "actions" | "completion";

export type DashboardStatistic = {
  id: string;
  label: string;
  value: string;
  context: string;
  tone: StatisticTone;
  icon: StatisticIcon;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: "upload" | "history" | "actions";
};

export const dashboardStatistics: ReadonlyArray<DashboardStatistic> = [
  {
    id: "meetings",
    label: "Meetings",
    value: "12",
    context: "4 this week",
    tone: "success",
    icon: "meetings",
  },
  {
    id: "time-saved",
    label: "Time saved",
    value: "8.4h",
    context: "2.1h this week",
    tone: "info",
    icon: "time",
  },
  {
    id: "open-actions",
    label: "Action items",
    value: "24",
    context: "7 still open",
    tone: "warning",
    icon: "actions",
  },
  {
    id: "completion",
    label: "Completion rate",
    value: "92%",
    context: "Across all meetings",
    tone: "neutral",
    icon: "completion",
  },
];

export const recentMeetings: ReadonlyArray<Meeting> = [
  {
    id: "meeting-product-weekly",
    title: "Product weekly",
    dateLabel: "Today",
    timeLabel: "10:00 AM",
    durationMinutes: 42,
    participantCount: 6,
    status: "complete",
  },
  {
    id: "meeting-design-critique",
    title: "Design critique",
    dateLabel: "Yesterday",
    timeLabel: "2:30 PM",
    durationMinutes: 31,
    participantCount: 4,
    status: "ready",
  },
  {
    id: "meeting-customer-onboarding",
    title: "Customer onboarding",
    dateLabel: "Jul 13",
    timeLabel: "11:00 AM",
    durationMinutes: 54,
    participantCount: 8,
    status: "processing",
  },
  {
    id: "meeting-engineering-planning",
    title: "Engineering planning",
    dateLabel: "Jul 12",
    timeLabel: "4:00 PM",
    durationMinutes: 48,
    participantCount: 5,
    status: "draft",
  },
];

export const dashboardQuickActions: ReadonlyArray<DashboardQuickAction> = [
  {
    id: "upload",
    label: "Upload recording",
    description: "Add audio to your processing queue",
    href: "#processing-empty",
    icon: "upload",
  },
  {
    id: "history",
    label: "View meeting history",
    description: "Review recent meeting activity",
    href: "#recent-meetings",
    icon: "history",
  },
  {
    id: "actions",
    label: "Review action items",
    description: "See the open work across meetings",
    href: "#open-action-items",
    icon: "actions",
  },
];
