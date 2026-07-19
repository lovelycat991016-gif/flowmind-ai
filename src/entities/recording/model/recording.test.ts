import { describe, expect, it } from "vitest";

import {
  formatRecordingFileSize,
  isActiveRecordingUploadStatus,
} from "./recording";

describe("recording presentation helpers", () => {
  it("formats file sizes for display", () => {
    expect(formatRecordingFileSize(1024)).toBe("1 KB");
    expect(formatRecordingFileSize(1_048_576)).toBe("1 MB");
  });

  it("identifies statuses that occupy the active recording slot", () => {
    expect(isActiveRecordingUploadStatus("pending")).toBe(true);
    expect(isActiveRecordingUploadStatus("uploading")).toBe(true);
    expect(isActiveRecordingUploadStatus("uploaded")).toBe(true);
    expect(isActiveRecordingUploadStatus("failed")).toBe(false);
    expect(isActiveRecordingUploadStatus("cancelled")).toBe(false);
  });
});
