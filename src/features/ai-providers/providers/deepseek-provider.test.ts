import { afterEach, describe, expect, it, vi } from "vitest";

import { AIProviderError, DeepSeekProvider } from "./deepseek-provider";

const request = { system: "Return JSON", input: "meeting text" };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("DeepSeekProvider", () => {
  it("maps a structured Chat Completions response without exposing the API key", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"summary":"已生成"}' } }],
        }),
        { status: 200 },
      ),
    );
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
      transport,
    });

    await expect(provider.generateStructuredOutput(request)).resolves.toEqual({
      summary: "已生成",
    });
    expect(provider.metadata).toEqual({
      provider: "deepseek",
      model: "deepseek-chat",
    });
    expect(JSON.stringify(provider.metadata)).not.toContain("private-key");
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer private-key" }),
      }),
    );
  });

  it.each([
    [429, "rate_limited"],
    [408, "timeout"],
    [500, "unavailable"],
    [400, "rejected_input"],
  ] as const)("maps HTTP %i to the safe %s error", async (status, code) => {
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
      transport: async () => new Response("provider detail", { status }),
    });

    await expect(provider.generateTextResponse(request)).rejects.toMatchObject({
      code,
    });
  });

  it("rejects an invalid Chat Completions JSON structure safely", async () => {
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
      transport: async () => new Response("{not-json", { status: 200 }),
    });

    await expect(provider.generateStructuredOutput(request)).rejects.toMatchObject(
      { code: "malformed_output" },
    );
  });

  it("aborts the server fetch after the bounded provider timeout", async () => {
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
    const provider = new DeepSeekProvider({
      apiKey: "private-key",
      model: "deepseek-chat",
    });
    const operation = provider.generateTextResponse(request);
    operation.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(30_000);

    await expect(operation).rejects.toMatchObject({ code: "timeout" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("retains the safe error class", () => {
    expect(AIProviderError).toBeDefined();
  });
});
