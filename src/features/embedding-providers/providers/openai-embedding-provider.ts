import {
  EMBEDDING_DIMENSIONS,
  type EmbeddingProvider,
  validateEmbedding,
} from "../model/embedding-provider";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_REQUEST_TIMEOUT_MS = 30_000;

type EmbeddingProviderErrorCode =
  | "timeout"
  | "rate_limited"
  | "unavailable"
  | "rejected_input"
  | "malformed_output"
  | "request_failed";

export class EmbeddingProviderError extends Error {
  constructor(readonly code: EmbeddingProviderErrorCode) {
    super("Embedding provider request failed.");
    this.name = "EmbeddingProviderError";
  }
}

export type OpenAIEmbeddingTransportRequest = {
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  body: string;
  signal: AbortSignal;
};

export type OpenAIEmbeddingTransport = (
  request: OpenAIEmbeddingTransportRequest,
) => Promise<Response>;

function mapHttpFailure(status: number): EmbeddingProviderErrorCode {
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "unavailable";
  if ([400, 413, 422].includes(status)) return "rejected_input";
  return "request_failed";
}

function mapTransportFailure(
  error: unknown,
  signal: AbortSignal,
): EmbeddingProviderErrorCode {
  if (
    signal.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  ) {
    return "timeout";
  }
  return "request_failed";
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly metadata;
  private readonly transport: OpenAIEmbeddingTransport;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      transport?: OpenAIEmbeddingTransport;
    },
  ) {
    this.metadata = { provider: "openai" as const, model: options.model };
    this.transport =
      options.transport ??
      ((request) =>
        fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          signal: request.signal,
        }));
  }

  async embed(text: string, options?: { signal?: AbortSignal }): Promise<number[]> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options?.signal?.addEventListener("abort", abort, { once: true });
    if (options?.signal?.aborted) controller.abort();
    const timeout = setTimeout(
      () => controller.abort(),
      EMBEDDING_REQUEST_TIMEOUT_MS,
    );
    let response: Response;
    try {
      response = await this.transport({
        url: OPENAI_EMBEDDINGS_URL,
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.model,
          input: text,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new EmbeddingProviderError(
        mapTransportFailure(error, controller.signal),
      );
    } finally {
      clearTimeout(timeout);
      options?.signal?.removeEventListener("abort", abort);
    }
    if (!response.ok) {
      throw new EmbeddingProviderError(mapHttpFailure(response.status));
    }
    try {
      const payload = (await response.json()) as {
        data?: Array<{ embedding?: unknown }>;
      };
      const vector = payload.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.some((value) => typeof value !== "number")) {
        throw new EmbeddingProviderError("malformed_output");
      }
      return validateEmbedding(vector);
    } catch (error) {
      if (error instanceof EmbeddingProviderError) throw error;
      throw new EmbeddingProviderError("malformed_output");
    }
  }
}
