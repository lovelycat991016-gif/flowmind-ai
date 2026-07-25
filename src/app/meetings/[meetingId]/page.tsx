import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeetingById } from "@/features/meetings/queries/get-meetings";
import { getRecordingForMeeting } from "@/features/recordings/queries/get-recording-for-meeting";
import { getProcessingJobForRecording } from "@/features/processing-jobs/queries/get-processing-job-for-recording";
import { getTranscriptForRecording } from "@/features/transcription/queries/get-transcript-for-recording";
import { getMeetingIntelligence } from "@/features/meeting-intelligence/queries/get-meeting-intelligence";
import { meetingIdSchema } from "@/features/meetings/schemas/meeting-input";
import { MeetingDetail } from "@/widgets/meetings/ui/meeting-detail";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.meetings.meeting };

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) notFound();

  const meeting = await getMeetingById(parsed.data);
  if (!meeting) notFound();

  const recording = await getRecordingForMeeting(meeting.id);
  const intelligencePromise = getMeetingIntelligence(meeting.id);
  const [processingJob, transcript, intelligence] = recording
    ? await Promise.all([
        getProcessingJobForRecording(recording.id),
        getTranscriptForRecording(recording.id),
        intelligencePromise,
      ])
    : [null, null, await intelligencePromise];

  return (
    <MeetingDetail
      meeting={meeting}
      processingJob={processingJob}
      recording={recording}
      transcript={transcript}
      intelligence={intelligence}
    />
  );
}
