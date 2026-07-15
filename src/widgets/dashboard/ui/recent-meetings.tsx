import { Clock3, UsersRound, Video } from "lucide-react";

import {
  formatMeetingDuration,
  type Meeting,
} from "@/entities/meeting/model/meeting";
import { MeetingStatusBadge } from "@/entities/meeting/ui/meeting-status-badge";
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
  meetings: ReadonlyArray<Meeting>;
}) {
  return (
    <Card className="overflow-hidden" id="recent-meetings">
      <CardHeader className="border-b px-5 pt-5 pb-4 sm:px-6">
        <CardTitle as="h2" id="recent-meetings-title">
          Recent meetings
        </CardTitle>
        <CardDescription>
          Your latest meeting activity and processing status.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul aria-label="Recent meetings" className="divide-border divide-y">
          {meetings.map((meeting) => (
            <li
              className="grid min-h-20 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 sm:grid-cols-[40px_minmax(0,1fr)_96px_108px] sm:px-6"
              data-testid="meeting-row"
              key={meeting.id}
            >
              <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
                <Video aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {meeting.title}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {meeting.dateLabel} · {meeting.timeLabel}
                </p>
              </div>
              <div className="justify-self-end sm:order-last">
                <MeetingStatusBadge status={meeting.status} />
              </div>
              <div className="text-muted-foreground col-start-2 flex items-center gap-3 text-xs sm:col-auto sm:flex-col sm:items-start sm:gap-1">
                <span className="flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {formatMeetingDuration(meeting.durationMinutes)}
                </span>
                <span className="flex items-center gap-1.5">
                  <UsersRound aria-hidden="true" className="size-3.5" />
                  {meeting.participantCount} people
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
