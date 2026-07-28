import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const configurationDocument = path.resolve(
  "docs/qa/sprint-15-production-ai-configuration.md",
);

describe("production AI configuration contract", () => {
  it("documents the explicit chat and embedding provider configuration", () => {
    const document = readFileSync(configurationDocument, "utf8");

    expect(document).toContain("AI_PROVIDER=deepseek");
    expect(document).toContain("DEEPSEEK_API_KEY");
    expect(document).toContain("DEEPSEEK_MODEL");
    expect(document).toContain("EMBEDDING_PROVIDER=openai");
    expect(document).toContain("EMBEDDING_API_KEY");
    expect(document).toContain("EMBEDDING_MODEL");
  });

  it("documents server-only secrets and the safe production failure behavior", () => {
    const document = readFileSync(configurationDocument, "utf8");

    expect(document).toContain("NEXT_PUBLIC_");
    expect(document).toContain("must not");
    expect(document).toContain("mock");
    expect(document).toContain("Usage Event");
  });
});
