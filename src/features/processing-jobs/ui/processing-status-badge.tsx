import type { ProcessingJobStatus } from "@/entities/processing-job/model/processing-job";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Badge } from "@/shared/ui/badge";

const statusPresentation = {
  queued: { label: zhCN.processingJobs.queued, variant: "info" },
  running: { label: zhCN.processingJobs.running, variant: "info" },
  completed: { label: zhCN.processingJobs.completed, variant: "success" },
  failed: { label: zhCN.processingJobs.failed, variant: "warning" },
  cancelled: { label: zhCN.processingJobs.cancelled, variant: "neutral" },
} as const;

export function ProcessingStatusBadge({
  status,
}: {
  status: ProcessingJobStatus;
}) {
  const presentation = statusPresentation[status];

  return (
    <Badge
      aria-label={`${zhCN.processingJobs.title}：${presentation.label}`}
      role="status"
      variant={presentation.variant}
    >
      {presentation.label}
    </Badge>
  );
}
