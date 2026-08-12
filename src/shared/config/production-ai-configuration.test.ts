import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const configurationDocument = path.resolve(
  "docs/qa/sprint-15-production-ai-configuration.md",
);

describe("production AI configuration contract", () => {
  it("documents DeepSeek Chat production support and the mock embedding boundary", () => {
    const document = readFileSync(configurationDocument, "utf8");

    expect(document).toContain("AI_PROVIDER=deepseek");
    expect(document).toContain("DEEPSEEK_API_KEY");
    expect(document).toContain("DEEPSEEK_MODEL");
    expect(document).toContain("EMBEDDING_PROVIDER=mock");
    expect(document).toContain("EMBEDDING_API_KEY");
    expect(document).toContain("EMBEDDING_MODEL");
    expect(document).toContain("development and test");
    expect(document).toContain("production RAG requires a real embedding provider");
    expect(document).toContain("DeepSeek does not currently support embeddings");
  });

  it("documents server-only secrets and explicit configuration rejection", () => {
    const document = readFileSync(configurationDocument, "utf8");

    expect(document).toContain("NEXT_PUBLIC_");
    expect(document).toContain("must not");
    expect(document).toContain("mock");
    expect(document).toContain("must fail safely");
    expect(document).toContain("Usage Event");
    expect(document).toContain("EMBEDDING_PROVIDER=openai");
    expect(document).not.toContain("NEXT_PUBLIC_EMBEDDING_API_KEY=");
  });
});
