import { CalendarDays } from "lucide-react";
import type { MeetingDetail as MeetingDetailModel } from "@/entities/meeting/model/meeting";
import { formatMeetingDate } from "@/entities/meeting/model/meeting";
import { RenameMeetingForm } from "@/features/meetings/ui/rename-meeting-form";
import { archiveMeetingAction } from "@/features/meetings/actions/archive-meeting";
import { restoreMeetingAction } from "@/features/meetings/actions/restore-meeting";
import { DeleteMeetingDialog } from "@/features/meetings/ui/delete-meeting-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MeetingDetail({ meeting }: { meeting: MeetingDetailModel }) {
  const isArchived = Boolean(meeting.archivedAt);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <a className="text-muted-foreground text-sm hover:underline" href="/meetings">Back to meetings</a>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm"><CalendarDays className="size-4" aria-hidden="true" />{formatMeetingDate(meeting.meetingDate)}</p>
        </div>
        <Badge variant={isArchived ? "neutral" : "success"}>{isArchived ? "Archived" : "Active"}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle as="h2">Edit meeting</CardTitle></CardHeader>
        <CardContent><RenameMeetingForm meetingId={meeting.id} title={meeting.title} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle as="h2">Meeting lifecycle</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={isArchived ? restoreMeetingAction : archiveMeetingAction}>
            <input name="id" type="hidden" value={meeting.id} />
            <Button type="submit" variant="outline">{isArchived ? "Restore meeting" : "Archive meeting"}</Button>
          </form>
          <DeleteMeetingDialog meetingId={meeting.id} title={meeting.title} />
        </CardContent>
      </Card>
    </div>
  );
}
