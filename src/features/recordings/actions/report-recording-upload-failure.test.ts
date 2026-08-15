import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createRecordingUploadDiagnostic: vi.fn((input) => input),
  reportServerEvent: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/shared/observability/server", () => ({
  createRecordingUploadDiagnostic: mocks.createRecordingUploadDiagnostic,
  reportServerEvent: mocks.reportServerEvent,
}));

import { reportRecordingUploadFailure } from "./report-recording-upload-failure";

describe("reportRecordingUploadFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records an authenticated direct upload failure with allowlisted metadata", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: {} } }) },
    });

    await expect(
      reportRecordingUploadFailure({
        errorCategory: "http_403",
        errorCode: "403",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createRecordingUploadDiagnostic).toHaveBeenCalledWith({
      stage: "direct_upload",
      errorCategory: "http_403",
      errorCode: "403",
      authenticatedUserPresent: true,
    });
    expect(mocks.reportServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "storage",
        operation: "recording_upload_intent",
        outcome: "failure",
        failureCode: "storage_operation_failed",
      }),
    );
  });

  it("drops invalid diagnostic input without initializing a server client", async () => {
    await reportRecordingUploadFailure({
      errorCategory: "http_403",
      errorCode: "Bearer private-token",
    });

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.reportServerEvent).not.toHaveBeenCalled();
  });
});
