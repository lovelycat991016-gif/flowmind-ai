import { createSupabaseReindexDependencies } from "../src/features/embedding-reindex/service/create-supabase-reindex-dependencies";
import { reindexMeetingDocumentChunks } from "../src/features/embedding-reindex";

function argument(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  if (process.env.VERCEL_ENV !== "preview") {
    throw new Error("Embedding reindex is only available in Preview.");
  }
  const ownerId = argument("owner");
  if (!ownerId) throw new Error("Embedding reindex input is invalid.");
  const batchSize = Number(argument("batch-size") ?? "50");
  const cursor = argument("cursor");
  const result = await reindexMeetingDocumentChunks({ ownerId, batchSize, cursor }, createSupabaseReindexDependencies());
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch(() => {
  process.stderr.write("Embedding reindex failed.\n");
  process.exitCode = 1;
});
