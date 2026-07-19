import type { MeetingIntelligenceResult } from "@/entities/meeting-intelligence/model/meeting-intelligence";

export type MeetingIntelligenceRequest = {
  transcriptContent: string;
  transcriptLanguage: string | null;
  promptVersion: string;
};

export interface MeetingIntelligenceProvider {
  generate(
    input: MeetingIntelligenceRequest,
  ): Promise<MeetingIntelligenceResult>;
}
