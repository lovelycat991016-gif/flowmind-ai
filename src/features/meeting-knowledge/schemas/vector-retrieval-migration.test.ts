import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202607280005_add_vector_retrieval_rpc.sql",
  "utf8",
).toLowerCase();

describe("meeting knowledge vector retrieval migration", () => {
  it("defines an owner-scoped cosine RPC with a bounded result count", () => {
    expect(sql).toContain("using hnsw (embedding vector_cosine_ops)");
    expect(sql).toContain("create or replace function public.match_meeting_document_chunks");
    expect(sql).toContain("p_query_embedding vector(1536)");
    expect(sql).toContain("p_match_count integer");
    expect(sql).toContain("p_match_count not between 1 and 20");
    expect(sql).toContain("user_id = (select auth.uid())");
    expect(sql).toContain("1 - (chunks.embedding <=> p_query_embedding)");
    expect(sql).not.toContain("returning embedding");
  });
});
