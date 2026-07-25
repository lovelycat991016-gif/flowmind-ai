import { describe, expect, it } from "vitest";

import { parseOpenAIEnv } from "./openai-env";

describe("parseOpenAIEnv", () => {
  it("uses the default model with a server-only API key", () => {
    expect(parseOpenAIEnv({ OPENAI_API_KEY: "server-key" })).toEqual({
      apiKey: "server-key",
      model: "gpt-4.1-mini",
    });
  });

  it("accepts a configured model and rejects missing credentials safely", () => {
    expect(
      parseOpenAIEnv({ OPENAI_API_KEY: "server-key", OPENAI_MODEL: "gpt-4.1" }),
    ).toEqual({ apiKey: "server-key", model: "gpt-4.1" });
    expect(() => parseOpenAIEnv({})).toThrow(
      "OpenAI environment configuration is invalid.",
    );
  });
});
