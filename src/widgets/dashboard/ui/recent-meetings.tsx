import { CalendarDays, Video } from "lucide-react";

import {
  formatMeetingDate,
  type MeetingListItem,
} from "@/entities/meeting/model/meeting";
import { EmptyPlaceholder } from "@/shared/ui/empty-placeholder";
import { zhCN } from "@/shared/i18n/zh-CN";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export function RecentMeetings({
  meetings,
}: {
  meetings: ReadonlyArray<MeetingListItem>;
}) {
  return (
    <Card className="overflow-hidden" id="recent-meetings">
      <CardHeader className="border-b px-5 pt-5 pb-4 sm:px-6">
        <CardTitle as="h2" id="recent-meetings-title">
          {zhCN.dashboard.recent}
        </CardTitle>
        <CardDescription>{zhCN.dashboard.activeMeetings}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!meetings.length ? (
          <EmptyPlaceholder
            className="min-h-44 border-0 shadow-none"
            description={zhCN.dashboard.createToSee}
            icon={Video}
            title={zhCN.dashboard.noRecent}
          />
        ) : (
          <ul
            aria-label={zhCN.dashboard.recent}
            className="divide-border divide-y"
          >
            {meetings.map((meeting) => (
              <li
                className="grid min-h-20 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:px-6"
                data-testid="meeting-row"
                key={meeting.id}
              >
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
                  <Video aria-hidden="true" className="size-4" />
                </span>
                <p className="truncate text-sm font-semibold">
                  {meeting.title}
                </p>
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  {formatMeetingDate(meeting.meetingDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
