import type { ProcessingJob } from "@/entities/processing-job/model/processing-job";
import type { Recording } from "@/entities/recording/model/recording";
import { zhCN } from "@/shared/i18n/zh-CN";

import { ProcessingStatusBadge } from "./processing-status-badge";

export function ProcessingStatusSection({
  processingJob,
  recording,
}: {
  processingJob: ProcessingJob | null;
  recording: Recording | null;
}) {
  if (!recording || !processingJob) return null;

  return (
    <section
      aria-labelledby="processing-status-heading"
      className="border-t pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium" id="processing-status-heading">
          {zhCN.processingJobs.title}
        </h3>
        <ProcessingStatusBadge status={processingJob.status} />
      </div>
    </section>
  );
}
