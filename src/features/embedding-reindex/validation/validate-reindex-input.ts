import { z } from "zod";

import type { ReindexCursor, ReindexInput } from "../model/reindex-contract";

const inputSchema = z.object({
  ownerId: z.uuid(),
  batchSize: z.number().int().min(1).max(100),
  cursor: z.string().optional(),
});
const cursorSchema = z.object({ transcriptId: z.uuid(), chunkIndex: z.number().int().min(0) });

export function validateReindexInput(input: ReindexInput) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Embedding reindex input is invalid.");
  return parsed.data;
}

export function decodeReindexCursor(value?: string): ReindexCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (parsed.success) return parsed.data;
  } catch {}
  throw new Error("Embedding reindex input is invalid.");
}

export function encodeReindexCursor(cursor: ReindexCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function validateReindexAccess(input: { environment: string | undefined; allowedOwners: string | undefined; ownerId: string }) {
  if (input.environment !== "preview") throw new Error("Embedding reindex is only available in Preview.");
  const owners = (input.allowedOwners ?? "").split(",").map((owner) => owner.trim()).filter(Boolean);
  if (!owners.includes(input.ownerId)) throw new Error("Embedding reindex is not authorized.");
}
