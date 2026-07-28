import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmbeddingProvider: vi.fn(),
  searchMeetingChunks: vi.fn(),
}));

vi.mock("@/features/embedding-providers/factory/create-embedding-provider", () => ({
  createEmbeddingProvider: mocks.createEmbeddingProvider,
}));
vi.mock("./vector-search-repository", () => ({
  searchMeetingChunks: mocks.searchMeetingChunks,
}));

import { retrieveMeetingContext } from "./retrieve-meeting-context";

describe("retrieveMeetingContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the question embedding to retrieve bounded meeting context", async () => {
    const embedding = Array(1536).fill(0);
    mocks.createEmbeddingProvider.mockReturnValue({
      embed: vi.fn().mockResolvedValue(embedding),
    });
    mocks.searchMeetingChunks.mockResolvedValue([
      {
        content: "相关历史会议内容",
        metadata: {},
        meetingId: "historical-meeting",
        similarity: 0.95,
      },
    ]);

    await expect(
      retrieveMeetingContext({
        question: "上次如何讨论发布风险？",
        meetingId: "current-meeting",
      }),
    ).resolves.toHaveLength(1);
    expect(mocks.searchMeetingChunks).toHaveBeenCalledWith({
      embedding,
      meetingId: "current-meeting",
      matchCount: 6,
    });
  });

  it("falls back to empty context when embedding fails", async () => {
    mocks.createEmbeddingProvider.mockReturnValue({
      embed: vi.fn().mockRejectedValue(new Error("provider failure")),
    });

    await expect(
      retrieveMeetingContext({ question: "历史问题" }),
    ).resolves.toEqual([]);
  });

  it("falls back to empty context when the repository throws", async () => {
    mocks.createEmbeddingProvider.mockReturnValue({
      embed: vi.fn().mockResolvedValue(Array(1536).fill(0)),
    });
    mocks.searchMeetingChunks.mockRejectedValue(new Error("database failure"));

    await expect(
      retrieveMeetingContext({ question: "历史问题" }),
    ).resolves.toEqual([]);
  });
});
