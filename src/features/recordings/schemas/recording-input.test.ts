import { describe, expect, it } from "vitest";

import {
  MAX_RECORDING_FILE_SIZE_BYTES,
  recordingLifecycleTransitionSchema,
  recordingUploadMetadataSchema,
} from "./recording-input";

describe("recording upload metadata", () => {
  const validMetadata = {
    meetingId: "6b79f5f3-f083-4a75-b74b-41342f2b1454",
    filename: "weekly-review.webm",
    mimeType: "audio/webm",
    fileSizeBytes: 1024,
  };

  it("normalizes filename whitespace without removing its extension", () => {
    const result = recordingUploadMetadataSchema.parse({
      ...validMetadata,
      filename: "  weekly-review.webm  ",
    });

    expect(result.filename).toBe("weekly-review.webm");
  });

  it("rejects empty filenames, invalid meeting IDs, and unsupported MIME types", () => {
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        filename: "   ",
      }).success,
    ).toBe(false);
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        meetingId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        mimeType: "audio/ogg",
      }).success,
    ).toBe(false);
  });

  it.each(["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm"])(
    "accepts %s",
    (mimeType) => {
      expect(
        recordingUploadMetadataSchema.safeParse({
          ...validMetadata,
          mimeType,
        }).success,
      ).toBe(true);
    },
  );

  it("accepts size boundaries and rejects values outside the approved range", () => {
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        fileSizeBytes: 1,
      }).success,
    ).toBe(true);
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        fileSizeBytes: MAX_RECORDING_FILE_SIZE_BYTES,
      }).success,
    ).toBe(true);
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        fileSizeBytes: 0,
      }).success,
    ).toBe(false);
    expect(
      recordingUploadMetadataSchema.safeParse({
        ...validMetadata,
        fileSizeBytes: MAX_RECORDING_FILE_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
  });
});

describe("recording lifecycle transitions", () => {
  it.each([
    ["pending", "uploading"],
    ["pending", "failed"],
    ["pending", "cancelled"],
    ["uploading", "uploaded"],
    ["uploading", "failed"],
    ["uploading", "cancelled"],
  ])("allows %s to %s", (from, to) => {
    expect(
      recordingLifecycleTransitionSchema.safeParse({ from, to }).success,
    ).toBe(true);
  });

  it.each([
    ["pending", "uploaded"],
    ["uploaded", "failed"],
    ["failed", "uploading"],
    ["cancelled", "uploading"],
  ])("rejects %s to %s", (from, to) => {
    expect(
      recordingLifecycleTransitionSchema.safeParse({ from, to }).success,
    ).toBe(false);
  });
});
