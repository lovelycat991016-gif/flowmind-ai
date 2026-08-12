export type ReindexInput = { ownerId: string; batchSize: number; cursor?: string };
export type ReindexCursor = { transcriptId: string; chunkIndex: number };
export type ReindexResult = {
  processed: number;
  succeeded: number;
  failed: number;
  nextCursor?: string;
  failures: { chunkId: string; errorCode: string }[];
};

export type ReindexChunk = ReindexCursor & {
  id: string;
  ownerId: string;
  content: string;
};
