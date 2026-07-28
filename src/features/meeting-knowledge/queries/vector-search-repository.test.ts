import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/shared/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { searchMeetingChunks } from "./vector-search-repository";

describe("searchMeetingChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the owner-filtered RPC result without exposing embeddings", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          content: "历史内容",
          metadata: { speaker: "Alice" },
          meeting_id: "m",
          similarity: 0.9,
        },
      ],
      error: null,
    });
    mocks.createClient.mockResolvedValue({ rpc });

    await expect(
      searchMeetingChunks({ embedding: Array(1536).fill(0), matchCount: 1 }),
    ).resolves.toEqual([
      {
        content: "历史内容",
        metadata: { speaker: "Alice" },
        meetingId: "m",
        similarity: 0.9,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("match_meeting_document_chunks", {
      p_query_embedding: expect.stringMatching(/^\[0,0,/),
      p_match_count: 1,
      p_meeting_id: null,
    });
  });

  it("rejects embeddings that are not 1536 dimensions", async () => {
    await expect(
      searchMeetingChunks({ embedding: [], matchCount: 1 }),
    ).resolves.toEqual([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects match counts outside the RPC boundary", async () => {
    await expect(
      searchMeetingChunks({ embedding: Array(1536).fill(0), matchCount: 0 }),
    ).resolves.toEqual([]);
    await expect(
      searchMeetingChunks({ embedding: Array(1536).fill(0), matchCount: 21 }),
    ).resolves.toEqual([]);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns empty chunks for RPC errors", async () => {
    mocks.createClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: {} }),
    });

    await expect(
      searchMeetingChunks({ embedding: Array(1536).fill(0), matchCount: 20 }),
    ).resolves.toEqual([]);
  });
});
