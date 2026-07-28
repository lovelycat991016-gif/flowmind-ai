import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EmbeddingProviderError,
  OpenAIEmbeddingProvider,
} from "./openai-embedding-provider";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("OpenAIEmbeddingProvider", () => {
  it("maps a production embedding response to a 1536-dimension vector", async () => {
    const vector = Array.from({ length: 1536 }, () => 0.25);
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ embedding: vector }] }), {
        status: 200,
      }),
    );
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "private-key",
      model: "text-embedding-3-small",
      transport,
    });

    await expect(provider.embed("meeting text")).resolves.toEqual(vector);
    expect(provider.metadata).toEqual({
      provider: "openai",
      model: "text-embedding-3-small",
    });
    expect(JSON.stringify(provider.metadata)).not.toContain("private-key");
    expect(JSON.parse(transport.mock.calls[0][0].body)).toEqual({
      model: "text-embedding-3-small",
      input: "meeting text",
      dimensions: 1536,
    });
  });

  it("rejects invalid embedding dimensions without returning a vector", async () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "private-key",
      model: "text-embedding-3-small",
      transport: async () =>
        new Response(JSON.stringify({ data: [{ embedding: [0, 1] }] }), {
          status: 200,
        }),
    });

    await expect(provider.embed("meeting text")).rejects.toMatchObject({
      code: "malformed_output",
    });
  });

  it.each([
    [429, "rate_limited"],
    [500, "unavailable"],
    [400, "rejected_input"],
  ] as const)("maps HTTP %i to safe error %s", async (status, code) => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "private-key",
      model: "text-embedding-3-small",
      transport: async () => new Response("provider detail", { status }),
    });

    await expect(provider.embed("meeting text")).rejects.toMatchObject({ code });
  });

  it("rejects malformed provider JSON safely", async () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "private-key",
      model: "text-embedding-3-small",
      transport: async () => new Response("{not-json", { status: 200 }),
    });

    await expect(provider.embed("meeting text")).rejects.toMatchObject({
      code: "malformed_output",
    });
  });

  it("aborts a timed out production fetch", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "private-key",
      model: "text-embedding-3-small",
    });
    const operation = provider.embed("meeting text");
    operation.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(30_000);

    await expect(operation).rejects.toMatchObject({ code: "timeout" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("uses the safe embedding provider error type", () => {
    expect(EmbeddingProviderError).toBeDefined();
  });
});
