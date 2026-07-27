import { describe, expect, it } from "vitest";
import { chunkTranscript } from "./chunk-transcript";
describe("chunkTranscript", () => {
  it("creates continuous overlapping chunks with safe metadata", () => {
    const chunks = chunkTranscript("a".repeat(1400), []);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[1].content.startsWith(chunks[0].content.slice(1000))).toBe(
      true,
    );
    expect(chunks[0].metadata).toMatchObject({ speaker: null, timestamp: null });
    expect(chunks[0].metadata.source_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
