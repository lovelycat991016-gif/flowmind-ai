export const aiProviderIds = ["deepseek", "openai", "mock"] as const;

export type AIProviderId = (typeof aiProviderIds)[number];

export type AIProviderMetadata = {
  provider: AIProviderId;
  model: string | null;
};

export type StructuredOutputRequest = {
  system: string;
  input: string;
};

export type TextResponseRequest = {
  system: string;
  input: string;
};

export type AIProviderErrorCode =
  | "configuration"
  | "timeout"
  | "rate_limited"
  | "unavailable"
  | "rejected_input"
  | "malformed_output"
  | "request_failed";

export class AIProviderError extends Error {
  constructor(readonly code: AIProviderErrorCode) {
    super("AI provider request failed.");
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  readonly metadata: AIProviderMetadata;
  generateStructuredOutput(input: StructuredOutputRequest): Promise<unknown>;
  generateTextResponse(input: TextResponseRequest): Promise<string>;
}
