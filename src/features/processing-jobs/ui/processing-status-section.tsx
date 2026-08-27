import type { ProcessingJob } from "@/entities/processing-job/model/processing-job";
import type { Recording } from "@/entities/recording/model/recording";
import { zhCN } from "@/shared/i18n/zh-CN";

import { getProcessingFailurePresentation } from "./processing-failure-presentation";
import { ProcessingStatusBadge } from "./processing-status-badge";

export function ProcessingStatusSection({
  processingJob,
  recording,
}: {
  processingJob: ProcessingJob | null;
  recording: Recording | null;
}) {
  if (!recording || !processingJob) return null;

  const failurePresentation =
    processingJob.status === "failed"
      ? getProcessingFailurePresentation(processingJob.errorMessage)
      : null;

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
      {processingJob.status === "queued" ? (
        <p aria-live="polite" className="text-muted-foreground mt-2 text-sm">
          {zhCN.processingJobs.queuedDescription}
        </p>
      ) : null}
      {failurePresentation ? (
        <div className="border-destructive mt-3 border-l-2 pl-3" role="alert">
          <p className="text-destructive text-sm font-medium">
            {failurePresentation.title}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {failurePresentation.description}
          </p>
        </div>
      ) : null}
    </section>
  );
}
