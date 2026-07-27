import type { AIProvider } from "@/features/ai-providers/model/ai-provider";
import { DeepSeekProvider } from "@/features/ai-providers/providers/deepseek-provider";
import { MockProvider } from "@/features/ai-providers/providers/mock-provider";
import { OpenAIProvider } from "@/features/ai-providers/providers/openai-provider";
import type { AIProviderConfiguration } from "@/shared/config/ai-provider-env";
import { getAIProviderEnv } from "@/shared/config/ai-provider-env";
import { reportServerEvent } from "@/shared/observability/server";

export function createAIProvider(
  configuration: AIProviderConfiguration,
): AIProvider {
  if (configuration.provider === "deepseek") {
    return new DeepSeekProvider(configuration);
  }
  if (configuration.provider === "openai") {
    return new OpenAIProvider(configuration.model);
  }
  if (configuration.fallbackReason) {
    reportServerEvent({
      category: "provider",
      operation: "meeting_intelligence_worker",
      outcome: "failure",
      failureCode: "provider_request_failed",
    });
  }
  return new MockProvider();
}

export function createAIProviderFromEnvironment() {
  return createAIProvider(getAIProviderEnv());
}
