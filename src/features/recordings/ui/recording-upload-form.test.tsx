import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  cancelUpload: vi.fn(),
  createUploadIntent: vi.fn(),
  finalizeUpload: vi.fn(),
}));

vi.mock("@/features/recordings/actions/cancel-upload", () => ({
  cancelUpload: actions.cancelUpload,
}));
vi.mock("@/features/recordings/actions/create-upload-intent", () => ({
  createUploadIntent: actions.createUploadIntent,
}));
vi.mock("@/features/recordings/actions/finalize-upload", () => ({
  finalizeUpload: actions.finalizeUpload,
}));

import { RecordingUploadForm } from "./recording-upload-form";

const meetingId = "cfb378e0-88e2-4cbf-946f-a8ca8f6df536";
const recordingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

class UploadRequest {
  static latest: UploadRequest | null = null;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  status = 0;
  onabort: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  abort() {
    this.onabort?.();
  }

  open() {}
  send() {
    UploadRequest.latest = this;
  }
  setRequestHeader() {}

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }

  succeed() {
    this.status = 201;
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

function audioFile(type = "audio/webm", size = 4) {
  return new File([new Uint8Array(size)], " weekly-review.webm ", { type });
}

function successfulIntent() {
  actions.createUploadIntent.mockResolvedValue({
    status: "success",
    data: {
      recordingId,
      signedUrl: "https://storage.example/upload",
      storagePath: "owner/meeting/recording.webm",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  UploadRequest.latest = null;
  vi.stubGlobal("XMLHttpRequest", UploadRequest);
  actions.finalizeUpload.mockResolvedValue({
    status: "success",
    data: { recordingId },
  });
  actions.cancelUpload.mockResolvedValue({
    status: "success",
    data: { recordingId },
  });
});

describe("RecordingUploadForm", () => {
  it("renders an accessible empty file selection state", () => {
    render(<RecordingUploadForm meetingId={meetingId} />);

    expect(screen.getByLabelText("选择录音文件")).toHaveAttribute(
      "accept",
      "audio/mpeg,audio/mp4,audio/wav,audio/webm",
    );
    expect(screen.getByText("支持 MP3、MP4、WAV 和 WebM 格式，文件不超过 500MB。"))
      .toBeVisible();
  });

  it("shows a Chinese validation error for an unsupported MIME type", async () => {
    render(<RecordingUploadForm meetingId={meetingId} />);
    fireEvent.change(screen.getByLabelText("选择录音文件"), {
      target: { files: [audioFile("audio/ogg")] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "仅支持 MP3、MP4、WAV 或 WebM 音频文件。",
    );
    expect(actions.createUploadIntent).not.toHaveBeenCalled();
  });

  it("rejects files larger than 500MB before creating an intent", async () => {
    render(<RecordingUploadForm meetingId={meetingId} />);
    const file = audioFile();
    Object.defineProperty(file, "size", { value: 524_288_001 });
    fireEvent.change(screen.getByLabelText("选择录音文件"), {
      target: { files: [file] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "录音文件不能超过 500MB。",
    );
    expect(actions.createUploadIntent).not.toHaveBeenCalled();
  });

  it("reports upload progress and finalizes a successful direct upload", async () => {
    successfulIntent();
    render(<RecordingUploadForm meetingId={meetingId} />);
    fireEvent.change(screen.getByLabelText("选择录音文件"), {
      target: { files: [audioFile()] },
    });

    await waitFor(() => expect(UploadRequest.latest).not.toBeNull());
    act(() => UploadRequest.latest?.progress(50, 100));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    act(() => UploadRequest.latest?.succeed());

    await waitFor(() => expect(actions.finalizeUpload).toHaveBeenCalledWith({ recordingId }));
    expect(await screen.findByText("录音上传完成。", { selector: "p" })).toBeVisible();
  });

  it("shows retry after an upload failure and creates a new intent", async () => {
    successfulIntent();
    render(<RecordingUploadForm meetingId={meetingId} />);
    fireEvent.change(screen.getByLabelText("选择录音文件"), {
      target: { files: [audioFile()] },
    });
    await waitFor(() => expect(UploadRequest.latest).not.toBeNull());
    act(() => UploadRequest.latest?.fail());

    expect(await screen.findByRole("button", { name: "重试上传" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "重试上传" }));
    await waitFor(() => expect(actions.createUploadIntent).toHaveBeenCalledTimes(2));
  });

  it("aborts the browser request and cancels its recording attempt", async () => {
    successfulIntent();
    render(<RecordingUploadForm meetingId={meetingId} />);
    fireEvent.change(screen.getByLabelText("选择录音文件"), {
      target: { files: [audioFile()] },
    });
    await waitFor(() => expect(UploadRequest.latest).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "取消上传" }));

    await waitFor(() => expect(actions.cancelUpload).toHaveBeenCalledWith({ recordingId }));
    expect(await screen.findByText("录音上传已取消。", { selector: "p" })).toBeVisible();
  });
});
