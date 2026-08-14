"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cancelUpload } from "@/features/recordings/actions/cancel-upload";
import { createUploadIntent } from "@/features/recordings/actions/create-upload-intent";
import { finalizeUpload } from "@/features/recordings/actions/finalize-upload";
import { reportRecordingUploadFailure } from "@/features/recordings/actions/report-recording-upload-failure";
import {
  MAX_RECORDING_FILE_SIZE_BYTES,
  recordingMimeTypes,
  recordingUploadMetadataSchema,
} from "@/features/recordings/schemas/recording-input";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zhCN } from "@/shared/i18n/zh-CN";

type UploadPhase = "idle" | "uploading" | "success" | "error" | "cancelled";
type UploadFailure =
  | { errorCategory: "network" }
  | {
      errorCategory:
        | "http_401"
        | "http_403"
        | "http_404"
        | "http_409"
        | "http_413"
        | "other_http";
      errorCode: string;
    };

function uploadFailureForStatus(status: number): UploadFailure {
  const errorCategory =
    ({
      401: "http_401",
      403: "http_403",
      404: "http_404",
      409: "http_409",
      413: "http_413",
    } as const)[status] ?? "other_http";
  return { errorCategory, errorCode: String(status) };
}

function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percentage: number) => void,
  requestRef: React.MutableRefObject<XMLHttpRequest | null>,
  signal: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    requestRef.current = request;

    const cleanUp = () => signal.removeEventListener("abort", abortRequest);
    const abortRequest = () => request.abort();

    if (signal.aborted) {
      reject(new Error("Upload cancelled"));
      return;
    }

    request.open("PUT", signedUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        cleanUp();
        resolve();
        return;
      }
      cleanUp();
      reject(uploadFailureForStatus(request.status));
    };
    request.onerror = () => {
      cleanUp();
      reject({ errorCategory: "network" } satisfies UploadFailure);
    };
    request.onabort = () => {
      cleanUp();
      reject(new Error("Upload cancelled"));
    };
    signal.addEventListener("abort", abortRequest, { once: true });
    request.send(file);
  });
}

export function RecordingUploadForm({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
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
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let intent: Awaited<ReturnType<typeof createUploadIntent>>;
    try {
      intent = await createUploadIntent(metadata.data);
    } catch {
      if (abortController.signal.aborted) {
        return;
      }
      setError(zhCN.recordings.uploadFailed);
      setPhase("error");
      return;
    }
    if (abortController.signal.aborted) {
      return;
    }
    if (intent.status === "error") {
      setError(intent.message);
      setPhase("error");
      return;
    }

    recordingIdRef.current = intent.data.recordingId;
    try {
      await uploadToSignedUrl(
        intent.data.signedUrl,
        selectedFile,
        setProgress,
        requestRef,
        abortController.signal,
      );
    } catch (error) {
      if (cancelledRef.current || abortController.signal.aborted) {
        if (
          abortControllerRef.current &&
          abortControllerRef.current !== abortController
        ) {
          return;
        }
        setError(null);
        setPhase("cancelled");
        return;
      }
      if (error && typeof error === "object" && "errorCategory" in error) {
        void reportRecordingUploadFailure(error as UploadFailure);
      }
      setError(zhCN.recordings.uploadFailed);
      setPhase("error");
      return;
    } finally {
      if (requestRef.current) requestRef.current = null;
    }

    let result: Awaited<ReturnType<typeof finalizeUpload>>;
    try {
      result = await finalizeUpload({
        recordingId: intent.data.recordingId,
      });
    } catch {
      setError(zhCN.recordings.uploadFailed);
      setPhase("error");
      return;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
    if (result.status === "error") {
      setError(result.message);
      setPhase("error");
      return;
    }

    setProgress(100);
    setPhase("success");
    router.refresh();
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    void startUpload(selectedFile);
  };

  const cancelCurrentUpload = async () => {
    const recordingId = recordingIdRef.current;
    const abortController = abortControllerRef.current;
    if (!recordingId && !abortController) return;
    cancelledRef.current = true;
    abortController?.abort();
    abortControllerRef.current = null;
    setError(null);
    setPhase("cancelled");
    recordingIdRef.current = null;

    if (!recordingId) return;

    try {
      await cancelUpload({ recordingId });
      router.refresh();
    } catch {
      // The browser request is already cancelled; do not return to uploading.
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recording-file">{zhCN.recordings.fileLabel}</Label>
        <Input
          accept="audio/mpeg,audio/mp4,audio/wav,audio/webm"
          disabled={phase === "uploading" || phase === "success"}
          id="recording-file"
          onChange={onFileChange}
          type="file"
        />
        <p className="text-muted-foreground text-sm">
          {zhCN.recordings.fileHelp}
        </p>
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
          <Button
            onClick={() => void cancelCurrentUpload()}
            type="button"
            variant="outline"
          >
            {zhCN.recordings.cancelUpload}
          </Button>
        </div>
      ) : null}

      {phase === "error" && file ? (
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
        <p
          aria-live="polite"
          className="text-muted-foreground text-sm"
          role="status"
        >
          {zhCN.recordings.uploading}
        </p>
      ) : null}
      {phase === "success" ? (
        <p aria-live="polite" className="text-sm" role="status">
          {zhCN.recordings.uploadComplete}
        </p>
      ) : null}
      {phase === "cancelled" ? (
        <p
          aria-live="polite"
          className="text-muted-foreground text-sm"
          role="status"
        >
          {zhCN.recordings.uploadCancelled}
        </p>
      ) : null}
    </div>
  );
}
