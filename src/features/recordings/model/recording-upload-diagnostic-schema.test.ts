import { describe, expect, it } from "vitest";

import { recordingUploadFailureSchema } from "./recording-upload-diagnostic-schema";

describe("recording upload diagnostic schema", () => {
  it.each([
    "network",
    "http_401",
    "http_403",
    "http_404",
    "http_409",
    "http_413",
    "other_http",
  ])("accepts the %s direct upload category", (errorCategory) => {
    expect(
      recordingUploadFailureSchema.safeParse({ errorCategory }).success,
    ).toBe(true);
  });

  it("accepts only a three-digit HTTP error code", () => {
    expect(
      recordingUploadFailureSchema.safeParse({
        errorCategory: "http_403",
        errorCode: "403",
      }).success,
    ).toBe(true);
    expect(
      recordingUploadFailureSchema.safeParse({
        errorCategory: "http_403",
        errorCode: "Bearer private-token",
      }).success,
    ).toBe(false);
  });
});
