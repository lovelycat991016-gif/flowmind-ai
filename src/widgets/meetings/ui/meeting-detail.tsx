import { CalendarDays } from "lucide-react";
import Link from "next/link";
import type { MeetingDetail as MeetingDetailModel } from "@/entities/meeting/model/meeting";
import type { Recording } from "@/entities/recording/model/recording";
import type { ProcessingJob } from "@/entities/processing-job/model/processing-job";
import type { MeetingAiMessage } from "@/entities/meeting-ai-message/model/meeting-ai-message";
import type { TranscriptWithSegments } from "@/features/transcription/queries/get-transcript-for-recording";
import { formatMeetingDate } from "@/entities/meeting/model/meeting";
import { RenameMeetingForm } from "@/features/meetings/ui/rename-meeting-form";
import { archiveMeetingAction } from "@/features/meetings/actions/archive-meeting";
import { restoreMeetingAction } from "@/features/meetings/actions/restore-meeting";
import { DeleteMeetingDialog } from "@/features/meetings/ui/delete-meeting-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { zhCN } from "@/shared/i18n/zh-CN";
import { MeetingRecordingSection } from "./meeting-recording-section";
import { TranscriptSection } from "@/features/transcription/ui/transcript-section";
import { MeetingIntelligenceSection } from "@/features/meeting-intelligence/ui/meeting-intelligence-section";
import { ManualIntelligenceForm } from "@/features/meeting-intelligence/ui/manual-intelligence-form";
import { MeetingCopilotSection } from "@/features/meeting-copilot/ui/meeting-copilot-section";

export function MeetingDetail({
  meeting,
  processingJob = null,
  recording = null,
  transcript = null,
  intelligence = null,
  copilotMessages = [],
}: {
  meeting: MeetingDetailModel;
  processingJob?: ProcessingJob | null;
  recording?: Recording | null;
  transcript?: TranscriptWithSegments | null;
  intelligence?: Parameters<
    typeof MeetingIntelligenceSection
  >[0]["intelligence"];
  copilotMessages?: MeetingAiMessage[];
}) {
  const isArchived = Boolean(meeting.archivedAt);
  const intelligencePending =
    intelligence?.status === "queued" || intelligence?.status === "running";
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        className="text-muted-foreground text-sm hover:underline"
        href="/meetings"
      >
        {zhCN.meetings.backToMeetings}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatMeetingDate(meeting.meetingDate)}
          </p>
        </div>
        <Badge variant={isArchived ? "neutral" : "success"}>
          {isArchived ? zhCN.meetings.archived : zhCN.meetings.active}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle as="h2">{zhCN.meetings.edit}</CardTitle>
        </CardHeader>
        <CardContent>
          <RenameMeetingForm meetingId={meeting.id} title={meeting.title} />
        </CardContent>
      </Card>
      <MeetingRecordingSection
        archived={isArchived}
        meetingId={meeting.id}
        processingJob={processingJob}
        recording={recording}
      />
      <TranscriptSection
        archived={isArchived}
        processingJob={processingJob}
        recording={recording}
        transcript={transcript}
      />
      {!intelligencePending && intelligence?.status !== "completed" ? (
        <ManualIntelligenceForm archived={isArchived} meetingId={meeting.id} />
      ) : null}
      <MeetingIntelligenceSection
        archived={isArchived}
        intelligence={intelligence}
      />
      <MeetingCopilotSection
        archived={isArchived}
        meetingId={meeting.id}
        messages={copilotMessages}
      />
      <Card>
        <CardHeader>
          <CardTitle as="h2">{zhCN.meetings.lifecycle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form
            action={isArchived ? restoreMeetingAction : archiveMeetingAction}
          >
            <input name="id" type="hidden" value={meeting.id} />
            <Button type="submit" variant="outline">
              {isArchived ? zhCN.meetings.restore : zhCN.meetings.archive}
            </Button>
          </form>
          <DeleteMeetingDialog meetingId={meeting.id} title={meeting.title} />
        </CardContent>
      </Card>
    </div>
  );
}
