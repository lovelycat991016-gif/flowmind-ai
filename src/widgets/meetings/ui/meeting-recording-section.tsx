import type { Recording } from "@/entities/recording/model/recording";
import { formatRecordingFileSize } from "@/entities/recording/model/recording";
import { formatMeetingDate } from "@/entities/meeting/model/meeting";
import { RecordingUploadForm } from "@/features/recordings/ui/recording-upload-form";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { zhCN } from "@/shared/i18n/zh-CN";

type MeetingRecordingSectionProps = {
  archived: boolean;
  meetingId: string;
  recording: Recording | null;
};

function RecordingMetadata({ recording }: { recording: Recording }) {
  const status = {
    uploaded: zhCN.recordings.uploaded,
    uploading: zhCN.recordings.statusUploading,
    failed: zhCN.recordings.failed,
    cancelled: zhCN.recordings.cancelled,
    pending: zhCN.recordings.statusUploading,
  }[recording.status];
  const variant =
    recording.status === "uploaded"
      ? "success"
      : recording.status === "failed"
        ? "warning"
        : "neutral";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{recording.originalFilename}</p>
        <Badge variant={variant}>{status}</Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        {formatRecordingFileSize(recording.fileSizeBytes)}
      </p>
      {recording.uploadedAt ? (
        <p className="text-muted-foreground text-sm">
          {zhCN.recordings.uploadedAt}：{formatMeetingDate(recording.uploadedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function MeetingRecordingSection({
  archived,
  meetingId,
  recording,
}: MeetingRecordingSectionProps) {
  const canUpload = !archived && (!recording || recording.status === "failed" || recording.status === "cancelled");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.recordings.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recording ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{zhCN.recordings.empty}</p>
            <p className="text-muted-foreground text-sm">
              {archived
                ? zhCN.recordings.archivedUnavailable
                : zhCN.recordings.emptyDescription}
            </p>
          </div>
        ) : (
          <RecordingMetadata recording={recording} />
        )}

        {recording?.status === "failed" ? (
          <p className="text-destructive text-sm" role="alert">
            {zhCN.recordings.uploadFailed}
          </p>
        ) : null}
        {recording?.status === "cancelled" ? (
          <p className="text-muted-foreground text-sm">
            {zhCN.recordings.retryDescription}
          </p>
        ) : null}
        {canUpload ? <RecordingUploadForm meetingId={meetingId} /> : null}
      </CardContent>
    </Card>
  );
}
