"use client";

import { useRef, useState } from "react";

import { cancelUpload } from "@/features/recordings/actions/cancel-upload";
import { createUploadIntent } from "@/features/recordings/actions/create-upload-intent";
import { finalizeUpload } from "@/features/recordings/actions/finalize-upload";
import {
  MAX_RECORDING_FILE_SIZE_BYTES,
  recordingMimeTypes,
  recordingUploadMetadataSchema,
} from "@/features/recordings/schemas/recording-input";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zhCN } from "@/shared/i18n/zh-CN";

type UploadPhase = "idle" | "uploading" | "failed" | "completed" | "cancelled";

function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percentage: number) => void,
  requestRef: React.MutableRefObject<XMLHttpRequest | null>,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.open("PUT", signedUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Upload failed"));
    };
    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new Error("Upload cancelled"));
    request.send(file);
  });
}

export function RecordingUploadForm({ meetingId }: { meetingId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const recordingIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);

  const startUpload = async (selectedFile: File) => {
    const metadata = recordingUploadMetadataSchema.safeParse({
      meetingId,
      filename: selectedFile.name,
      mimeType: selectedFile.type,
      fileSizeBytes: selectedFile.size,
    });
    if (!recordingMimeTypes.includes(selectedFile.type as never)) {
      setError(zhCN.recordings.invalidType);
      return;
    }
    if (selectedFile.size > MAX_RECORDING_FILE_SIZE_BYTES) {
      setError(zhCN.recordings.invalidSize);
      return;
    }
    if (!metadata.success) {
      setError(zhCN.recordings.invalidFile);
      return;
    }

    cancelledRef.current = false;
    setError(null);
    setPhase("uploading");
    setProgress(0);
    const intent = await createUploadIntent(metadata.data);
    if (intent.status === "error") {
      setError(intent.message);
      setPhase("failed");
      return;
    }

    recordingIdRef.current = intent.data.recordingId;
    try {
      await uploadToSignedUrl(
        intent.data.signedUrl,
        selectedFile,
        setProgress,
        requestRef,
      );
    } catch {
      if (cancelledRef.current) return;
      setError(zhCN.recordings.uploadFailed);
      setPhase("failed");
      return;
    }

    const result = await finalizeUpload({ recordingId: intent.data.recordingId });
    if (result.status === "error") {
      setError(result.message);
      setPhase("failed");
      return;
    }

    setProgress(100);
    setPhase("completed");
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    void startUpload(selectedFile);
  };

  const cancelCurrentUpload = async () => {
    if (!recordingIdRef.current) return;
    cancelledRef.current = true;
    requestRef.current?.abort();
    await cancelUpload({ recordingId: recordingIdRef.current });
    setError(null);
    setPhase("cancelled");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recording-file">{zhCN.recordings.fileLabel}</Label>
        <Input
          accept="audio/mpeg,audio/mp4,audio/wav,audio/webm"
          disabled={phase === "uploading" || phase === "completed"}
          id="recording-file"
          onChange={onFileChange}
          type="file"
        />
        <p className="text-muted-foreground text-sm">{zhCN.recordings.fileHelp}</p>
      </div>

      {file ? <p className="text-sm font-medium">{file.name.trim()}</p> : null}
      {phase === "uploading" ? (
        <div className="space-y-2">
          <div
            aria-label={zhCN.recordings.uploading}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="bg-muted h-2 overflow-hidden rounded-sm"
            role="progressbar"
          >
            <div
              className="bg-primary h-full transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Button onClick={() => void cancelCurrentUpload()} type="button" variant="outline">
            {zhCN.recordings.cancelUpload}
          </Button>
        </div>
      ) : null}

      {phase === "failed" && file ? (
        <Button onClick={() => void startUpload(file)} type="button">
          {zhCN.recordings.retryUpload}
        </Button>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {phase === "uploading" ? (
        <p aria-live="polite" className="text-muted-foreground text-sm" role="status">
          {zhCN.recordings.uploading}
        </p>
      ) : null}
      {phase === "completed" ? (
        <p aria-live="polite" className="text-sm" role="status">
          {zhCN.recordings.uploadComplete}
        </p>
      ) : null}
      {phase === "cancelled" ? (
        <p aria-live="polite" className="text-muted-foreground text-sm" role="status">
          {zhCN.recordings.uploadCancelled}
        </p>
      ) : null}
    </div>
  );
}
