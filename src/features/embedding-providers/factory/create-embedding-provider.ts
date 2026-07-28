import { MockEmbeddingProvider } from "../providers/mock-embedding-provider";
import { OpenAIEmbeddingProvider } from "../providers/openai-embedding-provider";
import { getEmbeddingProviderEnv } from "@/shared/config/embedding-provider-env";

export function createEmbeddingProvider() {
  const configuration = getEmbeddingProviderEnv();
  if (configuration.provider === "openai") {
    return new OpenAIEmbeddingProvider(configuration);
  }
  return new MockEmbeddingProvider();
}
