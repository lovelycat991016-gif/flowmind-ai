import { describe, expect, it, vi } from "vitest";

import { reindexMeetingDocumentChunks } from "./reindex-meeting-document-chunks";

const ownerId = "4050a593-2e4a-4d28-ae62-6eeac8ea9065";
const chunk = (id: string, transcriptId: string, chunkIndex: number) => ({
  id,
  ownerId,
  transcriptId,
  chunkIndex,
  content: `chunk ${id}`,
});

function dependencies(overrides: Partial<Parameters<typeof reindexMeetingDocumentChunks>[1]> = {}) {
  return {
    environment: "preview",
    allowedOwners: ownerId,
    loadPage: vi.fn().mockResolvedValue([chunk("a", "00000000-0000-4000-8000-000000000001", 0)]),
    updateEmbedding: vi.fn().mockResolvedValue(undefined),
    embeddingProvider: { metadata: { provider: "openai" as const, model: "text-embedding-3-small" }, embed: vi.fn().mockResolvedValue(Array(1536).fill(0.1)) },
    ...overrides,
  };
}

describe("reindexMeetingDocumentChunks", () => {
  it("processes an allowlisted Preview owner and returns a stable next cursor", async () => {
    const deps = dependencies();
    await expect(reindexMeetingDocumentChunks({ ownerId, batchSize: 50 }, deps)).resolves.toMatchObject({ processed: 1, succeeded: 1, failed: 0, nextCursor: expect.any(String) });
    expect(deps.loadPage).toHaveBeenCalledWith({ ownerId, batchSize: 50, cursor: undefined });
    expect(deps.updateEmbedding).toHaveBeenCalledWith({ chunkId: "a", ownerId, chunkIndex: 0, embedding: Array(1536).fill(0.1) });
  });

  it.each(["", "other", undefined])("rejects a missing or nonmatching owner allowlist", async (allowedOwners) => {
    await expect(reindexMeetingDocumentChunks({ ownerId, batchSize: 1 }, dependencies({ allowedOwners }))).rejects.toThrow("Embedding reindex is not authorized.");
  });

  it("rejects non-Preview execution and invalid batch sizes", async () => {
    await expect(reindexMeetingDocumentChunks({ ownerId, batchSize: 1 }, dependencies({ environment: "production" }))).rejects.toThrow("Embedding reindex is only available in Preview.");
    await expect(reindexMeetingDocumentChunks({ ownerId, batchSize: 101 }, dependencies())).rejects.toThrow("Embedding reindex input is invalid.");
  });

  it("decodes the cursor and scopes the next page to the same owner", async () => {
    const deps = dependencies({ loadPage: vi.fn().mockResolvedValue([]) });
    const cursor = Buffer.from(JSON.stringify({ transcriptId: "00000000-0000-4000-8000-000000000001", chunkIndex: 4 })).toString("base64url");
    await reindexMeetingDocumentChunks({ ownerId, batchSize: 2, cursor }, deps);
    expect(deps.loadPage).toHaveBeenCalledWith({ ownerId, batchSize: 2, cursor: { transcriptId: "00000000-0000-4000-8000-000000000001", chunkIndex: 4 } });
  });

  it("limits embedding concurrency to three and keeps failed chunks unchanged", async () => {
    let active = 0;
    let peak = 0;
    const pages = Array.from({ length: 5 }, (_, index) => chunk(String(index), "00000000-0000-4000-8000-000000000001", index));
    const deps = dependencies({
      loadPage: vi.fn().mockResolvedValue(pages),
      embeddingProvider: { metadata: { provider: "openai" as const, model: "text-embedding-3-small" }, embed: vi.fn(async (text: string) => { active += 1; peak = Math.max(peak, active); await Promise.resolve(); active -= 1; if (text === "chunk 2") throw Object.assign(new Error("private detail"), { code: "timeout" }); return Array(1536).fill(0.2); }) },
    });
    const result = await reindexMeetingDocumentChunks({ ownerId, batchSize: 5 }, deps);
    expect(peak).toBeLessThanOrEqual(3);
    expect(result).toMatchObject({ processed: 5, succeeded: 4, failed: 1, failures: [{ chunkId: "2", errorCode: "timeout" }] });
    expect(deps.updateEmbedding).toHaveBeenCalledTimes(4);
    expect(deps.updateEmbedding).not.toHaveBeenCalledWith(expect.objectContaining({ chunkId: "2" }));
  });
});
