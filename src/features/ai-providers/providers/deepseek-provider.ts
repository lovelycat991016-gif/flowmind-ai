import type {
  AIProvider,
  AIProviderErrorCode,
  AIProviderMetadata,
  StructuredOutputRequest,
  TextResponseRequest,
} from "@/features/ai-providers/model/ai-provider";
import { AIProviderError } from "@/features/ai-providers/model/ai-provider";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export type DeepSeekTransportRequest = {
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  body: string;
};

export type DeepSeekTransport = (
  request: DeepSeekTransportRequest,
) => Promise<Response>;

function mapHttpFailure(status: number): AIProviderErrorCode {
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "unavailable";
  if ([400, 413, 422].includes(status)) return "rejected_input";
  return "request_failed";
}

function mapTransportFailure(error: unknown): AIProviderErrorCode {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }
  return "request_failed";
}

function requestBody(
  input: StructuredOutputRequest | TextResponseRequest,
  model: string,
  structured: boolean,
) {
  return JSON.stringify({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.input },
    ],
    ...(structured ? { response_format: { type: "json_object" } } : {}),
  });
}

export class DeepSeekProvider implements AIProvider {
  readonly metadata: AIProviderMetadata;
  private readonly transport: DeepSeekTransport;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      transport?: DeepSeekTransport;
    },
  ) {
    this.metadata = { provider: "deepseek", model: options.model };
    this.transport =
      options.transport ??
      ((request) =>
        fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
        }));
  }

  async generateStructuredOutput(input: StructuredOutputRequest) {
    const content = await this.request(input, true);
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new AIProviderError("malformed_output");
    }
  }

  async generateTextResponse(input: TextResponseRequest) {
    return this.request(input, false);
  }

  private async request(
    input: StructuredOutputRequest | TextResponseRequest,
    structured: boolean,
  ) {
    let response: Response;
    try {
      response = await this.transport({
        url: DEEPSEEK_URL,
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: requestBody(input, this.options.model, structured),
      });
    } catch (error) {
      throw new AIProviderError(mapTransportFailure(error));
    }
    if (!response.ok)
      throw new AIProviderError(mapHttpFailure(response.status));
    try {
      const payload = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AIProviderError("malformed_output");
      }
      return content;
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError("malformed_output");
    }
  }
}

export { AIProviderError } from "@/features/ai-providers/model/ai-provider";
