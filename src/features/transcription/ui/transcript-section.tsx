import { FileText } from "lucide-react";

import type { ProcessingJob } from "@/entities/processing-job/model/processing-job";
import type { Recording } from "@/entities/recording/model/recording";
import type { TranscriptWithSegments } from "@/features/transcription/queries/get-transcript-for-recording";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyPlaceholder } from "@/shared/ui/empty-placeholder";

function formatTimestamp(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function getEmptyState(processingJob: ProcessingJob | null) {
  if (
    processingJob?.status === "queued" ||
    processingJob?.status === "running"
  ) {
    return {
      title: zhCN.transcripts.processingTitle,
      description: zhCN.transcripts.processingDescription,
    };
  }

  if (
    processingJob?.status === "failed" ||
    processingJob?.status === "cancelled"
  ) {
    return {
      title: zhCN.transcripts.emptyTitle,
      description: zhCN.transcripts.unavailableDescription,
    };
  }

  return {
    title: zhCN.transcripts.emptyTitle,
    description: zhCN.transcripts.emptyDescription,
  };
}

export function TranscriptSection({
  archived = false,
  processingJob,
  recording,
  transcript,
}: {
  archived?: boolean;
  processingJob: ProcessingJob | null;
  recording: Recording | null;
  transcript: TranscriptWithSegments | null;
}) {
  if (!recording) return null;

  const emptyState = getEmptyState(processingJob);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.transcripts.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!transcript ? (
          <EmptyPlaceholder icon={FileText} {...emptyState} />
        ) : (
          <>
            <div className="space-y-2">
              {transcript.language ? (
                <p className="text-muted-foreground text-sm">
                  {zhCN.transcripts.languageLabel}：
                  {transcript.language === "zh"
                    ? zhCN.transcripts.chinese
                    : transcript.language}
                </p>
              ) : null}
              {archived ? (
                <p className="text-muted-foreground text-sm">
                  {zhCN.transcripts.archivedReadOnly}
                </p>
              ) : null}
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {transcript.content}
              </p>
            </div>

            {transcript.segments.length > 0 ? (
              <section aria-labelledby="transcript-segments-heading">
                <h3
                  className="mb-3 text-sm font-medium"
                  id="transcript-segments-heading"
                >
                  {zhCN.transcripts.segments}
                </h3>
                <ol
                  aria-label={zhCN.transcripts.segmentList}
                  className="space-y-3"
                >
                  {transcript.segments.map((segment) => (
                    <li
                      className="grid gap-1 border-l-2 pl-3 sm:grid-cols-[6rem_1fr] sm:gap-4"
                      key={segment.segmentIndex}
                    >
                      <time className="text-muted-foreground text-xs tabular-nums">
                        {formatTimestamp(segment.startMs)} -{" "}
                        {formatTimestamp(segment.endMs)}
                      </time>
                      <p className="text-sm leading-6">{segment.content}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
