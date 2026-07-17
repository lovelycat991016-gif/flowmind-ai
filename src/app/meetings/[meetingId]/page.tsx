import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMeetingById } from "@/features/meetings/queries/get-meetings";
import { meetingIdSchema } from "@/features/meetings/schemas/meeting-input";
import { MeetingDetail } from "@/widgets/meetings/ui/meeting-detail";

export const metadata: Metadata = { title: "Meeting" };

export default async function MeetingDetailPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const parsed = meetingIdSchema.safeParse(meetingId);
  if (!parsed.success) notFound();

  const meeting = await getMeetingById(parsed.data);
  if (!meeting) notFound();

  return <MeetingDetail meeting={meeting} />;
}
