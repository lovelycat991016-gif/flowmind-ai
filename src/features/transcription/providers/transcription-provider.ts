import type { TranscriptionResult } from "@/entities/transcript/model/transcript";

export type TranscriptionRequest = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  language?: string;
  correlationId?: string;
  signal?: AbortSignal;
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionRequest): Promise<TranscriptionResult>;
}
