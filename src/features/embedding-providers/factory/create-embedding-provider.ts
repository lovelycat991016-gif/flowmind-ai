import { MockEmbeddingProvider } from "../providers/mock-embedding-provider";
import { getEmbeddingProviderEnv } from "@/shared/config/embedding-provider-env";
export function createEmbeddingProvider() {
  void getEmbeddingProviderEnv();
  return new MockEmbeddingProvider();
}
