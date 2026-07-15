import type { MeetingStatus } from "@/entities/meeting/model/meeting";
import { Badge, type BadgeProps } from "@/shared/ui/badge";

const statusPresentation: Record<
  MeetingStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  complete: { label: "Complete", variant: "success" },
  ready: { label: "Ready", variant: "info" },
  processing: { label: "Processing", variant: "warning" },
  draft: { label: "Draft", variant: "neutral" },
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const presentation = statusPresentation[status];
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}
