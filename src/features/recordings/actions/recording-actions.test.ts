import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  randomUUID: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { cancelUpload } from "./cancel-upload";
import { createUploadIntent } from "./create-upload-intent";
import { finalizeUpload } from "./finalize-upload";
import { recordingUploadActionError } from "./recording-action-state";

const userId = "2c15dfe2-ea8c-420e-85ad-e85901974931";
const meetingId = "cfb378e0-88e2-4cbf-946f-a8ca8f6df536";
const recordingId = "6b79f5f3-f083-4a75-b74b-41342f2b1454";
const processingJobId = "911a4a76-8622-49c9-b3d1-a07c55514f91";
const metadata = {
  meetingId,
  filename: "weekly-review.webm",
  mimeType: "audio/webm",
  fileSizeBytes: 1024,
};

function authenticatedClient() {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn(),
    storage: { from: vi.fn() },
  };
  mocks.createClient.mockResolvedValue(client);
  return client;
}

function singleResult(data: unknown, error: { message: string } | null = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.randomUUID.mockReturnValue(recordingId);
  vi.stubGlobal("crypto", { randomUUID: mocks.randomUUID });
});

describe("recording upload actions", () => {
  it("rejects an unauthenticated upload intent", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(createUploadIntent(metadata)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("verifies meeting ownership before creating a pending recording", async () => {
    const client = authenticatedClient();
    const meetingSingle = singleResult(null);
    const meetingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: meetingSingle,
    };
    client.from.mockReturnValue(meetingQuery);

    await expect(createUploadIntent(metadata)).resolves.toMatchObject({
      status: "error",
    });
    expect(client.from).toHaveBeenCalledWith("meetings");
    expect(meetingQuery.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("creates a pending row and returns an SDK signed upload URL", async () => {
    const client = authenticatedClient();
    const meetingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({ id: meetingId }),
    };
    const insertSingle = singleResult({ id: recordingId });
    const insertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    };
    const updateSingle = singleResult({ id: recordingId });
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({ single: updateSingle }),
    };
    client.from.mockImplementation((table: string) =>
      table === "meetings"
        ? meetingQuery
        : client.from.mock.calls.filter(([name]) => name === "recordings")
              .length === 1
          ? insertQuery
          : updateQuery,
    );
    const createSignedUploadUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/upload", path: "ignored" },
      error: null,
    });
    client.storage.from.mockReturnValue({ createSignedUploadUrl });

    await expect(createUploadIntent(metadata)).resolves.toEqual({
      status: "success",
      data: {
        recordingId,
        signedUrl: "https://storage.example/upload",
        storagePath: `${userId}/${meetingId}/${recordingId}.webm`,
      },
    });
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: recordingId,
        status: "pending",
        user_id: userId,
      }),
    );
    expect(createSignedUploadUrl).toHaveBeenCalledWith(
      `${userId}/${meetingId}/${recordingId}.webm`,
    );
  });

  it("finalizes an owner-visible upload after the Storage object is verified", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({
        id: recordingId,
        meeting_id: meetingId,
        storage_bucket: "recordings",
        storage_path: `${userId}/${meetingId}/${recordingId}.webm`,
        status: "uploading",
      }),
    };
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockReturnValue({ single: singleResult({ id: recordingId }) }),
    };
    const activeJobQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: singleResult(null),
    };
    const insertJobQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockReturnValue({ single: singleResult({ id: processingJobId }) }),
    };
    let recordingCalls = 0;
    let processingJobCalls = 0;
    client.from.mockImplementation((table: string) => {
      if (table === "recordings") {
        recordingCalls += 1;
        return recordingCalls === 1 ? recordingQuery : updateQuery;
      }
      processingJobCalls += 1;
      return processingJobCalls === 1 ? activeJobQuery : insertJobQuery;
    });
    client.storage.from.mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [{ name: `${recordingId}.webm` }],
        error: null,
      }),
    });

    await expect(finalizeUpload({ recordingId })).resolves.toMatchObject({
      status: "success",
    });
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "uploaded",
        uploaded_at: expect.any(String),
      }),
    );
    expect(recordingQuery.eq).toHaveBeenCalledWith("meetings.user_id", userId);
    expect(insertJobQuery.insert).toHaveBeenCalledWith({
      recording_id: recordingId,
      user_id: userId,
      status: "queued",
      attempt_count: 0,
    });
  });

  it("reuses the active job when uploaded recording finalization is repeated", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({
        id: recordingId,
        meeting_id: meetingId,
        storage_bucket: "recordings",
        storage_path: `${userId}/${meetingId}/${recordingId}.webm`,
        status: "uploaded",
      }),
    };
    const activeJobQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({ id: processingJobId }),
    };
    client.from.mockImplementation((table: string) =>
      table === "recordings" ? recordingQuery : activeJobQuery,
    );

    await expect(finalizeUpload({ recordingId })).resolves.toEqual({
      status: "success",
      data: { recordingId },
    });
    expect(client.storage.from).not.toHaveBeenCalled();
    expect(activeJobQuery.select).toHaveBeenCalled();
  });

  it("returns a safe error when processing job creation fails", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({
        id: recordingId,
        meeting_id: meetingId,
        storage_bucket: "recordings",
        storage_path: `${userId}/${meetingId}/${recordingId}.webm`,
        status: "uploading",
      }),
    };
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockReturnValue({ single: singleResult({ id: recordingId }) }),
    };
    const activeJobQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: singleResult(null),
    };
    const insertJobQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnValue({
        single: singleResult(null, { message: "sensitive database detail" }),
      }),
    };
    let recordingCalls = 0;
    let processingJobCalls = 0;
    client.from.mockImplementation((table: string) => {
      if (table === "recordings") {
        recordingCalls += 1;
        return recordingCalls === 1 ? recordingQuery : updateQuery;
      }
      processingJobCalls += 1;
      return processingJobCalls === 1 ? activeJobQuery : insertJobQuery;
    });
    client.storage.from.mockReturnValue({
      list: vi.fn().mockResolvedValue({
        data: [{ name: `${recordingId}.webm` }],
        error: null,
      }),
    });

    await expect(finalizeUpload({ recordingId })).resolves.toEqual({
      status: "error",
      message: recordingUploadActionError,
    });
  });

  it("returns a safe error when the expected object is missing", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({
        id: recordingId,
        storage_bucket: "recordings",
        storage_path: `${userId}/${meetingId}/${recordingId}.webm`,
        status: "uploading",
      }),
    };
    const failedUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    client.from.mockImplementation(() =>
      client.from.mock.calls.length === 1 ? recordingQuery : failedUpdate,
    );
    client.storage.from.mockReturnValue({
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await expect(finalizeUpload({ recordingId })).resolves.toEqual({
      status: "error",
      message: "暂时无法完成录音上传，请重试。",
    });
  });

  it("rejects a finalization attempt for a recording hidden by ownership", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult(null),
    };
    client.from.mockReturnValue(recordingQuery);

    await expect(finalizeUpload({ recordingId })).resolves.toMatchObject({
      status: "error",
    });
    expect(client.storage.from).not.toHaveBeenCalled();
  });

  it("cancels only a pending or uploading owner-visible recording", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({ id: recordingId, status: "uploading" }),
    };
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockReturnValue({ single: singleResult({ id: recordingId }) }),
    };
    client.from.mockImplementation(() =>
      client.from.mock.calls.length === 1 ? recordingQuery : updateQuery,
    );

    await expect(cancelUpload({ recordingId })).resolves.toMatchObject({
      status: "success",
    });
    expect(updateQuery.update).toHaveBeenCalledWith({ status: "cancelled" });
  });

  it("rejects cancellation after an invalid lifecycle transition", async () => {
    const client = authenticatedClient();
    const recordingQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: singleResult({ id: recordingId, status: "uploaded" }),
    };
    client.from.mockReturnValue(recordingQuery);

    await expect(cancelUpload({ recordingId })).resolves.toMatchObject({
      status: "error",
    });
  });
});
