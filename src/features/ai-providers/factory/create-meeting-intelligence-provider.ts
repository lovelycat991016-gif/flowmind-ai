import { z } from "zod";

import {
  AIProviderError,
  type AIProvider,
} from "@/features/ai-providers/model/ai-provider";
import { createAIProviderFromEnvironment } from "@/features/ai-providers/factory/create-ai-provider";
import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { MeetingIntelligenceProviderError } from "@/features/meeting-intelligence/providers/structured-meeting-intelligence-provider";
import {
  type MeetingIntelligenceRequest,
  type MeetingIntelligenceProvider,
} from "@/features/meeting-intelligence/providers/meeting-intelligence-provider";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";

const outputSchema = z.object({
  summary: z.string().trim().min(1).max(10_000),
  key_points: z.array(z.string().trim().min(1).max(2_000)).max(50),
  decisions: z.array(z.string().trim().min(1).max(2_000)).max(50),
  action_items: z
    .array(
      z.object({
        task: z.string().trim().min(1).max(2_000),
        owner: z.string().trim().min(1).max(200).optional(),
        deadline: z.iso.date().optional(),
      }),
    )
    .max(50),
  risks: z.array(z.string().trim().min(1).max(2_000)).max(50),
});

function mapProviderError(error: unknown): MeetingIntelligenceFailureCode {
  if (!(error instanceof AIProviderError)) return "provider_request_failed";
  const codes: Record<AIProviderError["code"], MeetingIntelligenceFailureCode> =
    {
      configuration: "provider_unavailable",
      timeout: "provider_timeout",
      rate_limited: "provider_rate_limited",
      unavailable: "provider_unavailable",
      rejected_input: "provider_rejected_input",
      malformed_output: "intelligence_output_invalid",
      request_failed: "provider_request_failed",
    };
  return codes[error.code];
}

function systemInstruction(language: string | null) {
  return `Analyze the meeting transcript${language ? ` in ${language}` : ""}. Return JSON only with summary, key_points, decisions, action_items, and risks. Each action item may contain task, owner, and deadline in YYYY-MM-DD format.`;
}

class FactoryMeetingIntelligenceProvider implements MeetingIntelligenceProvider {
  constructor(private readonly provider: AIProvider) {}

  async generate(
    input: MeetingIntelligenceRequest,
  ): Promise<MeetingIntelligenceResult> {
    let output: unknown;
    try {
      output = await this.provider.generateStructuredOutput({
        system: systemInstruction(input.transcriptLanguage),
        input: input.transcriptContent,
      });
    } catch (error) {
      throw new MeetingIntelligenceProviderError(mapProviderError(error));
    }

    const parsed = outputSchema.safeParse(output);
    if (!parsed.success) {
      throw new MeetingIntelligenceProviderError("intelligence_output_invalid");
    }
    const result = meetingIntelligenceResultSchema.safeParse({
      provider: this.provider.metadata.provider,
      modelIdentifier:
        this.provider.metadata.model ?? this.provider.metadata.provider,
      promptVersion: input.promptVersion,
      summary: { content: parsed.data.summary },
      keyPoints: parsed.data.key_points,
      decisions: parsed.data.decisions.map((content) => ({
        content,
        sourceSegmentIndex: null,
      })),
      actionItems: parsed.data.action_items.map((item) => ({
        content: item.task,
        assigneeName: item.owner ?? null,
        dueDate: item.deadline ?? null,
        sourceSegmentIndex: null,
      })),
      risks: parsed.data.risks,
      outputMetadata: { inputSource: "meeting_text" },
    });
    if (!result.success) {
      throw new MeetingIntelligenceProviderError("intelligence_output_invalid");
    }
    return result.data;
  }
}

export function createMeetingIntelligenceProviderFromAIProvider(
  provider: AIProvider,
): MeetingIntelligenceProvider {
  return new FactoryMeetingIntelligenceProvider(provider);
}

export function createMeetingIntelligenceProvider() {
  return createMeetingIntelligenceProviderFromAIProvider(
    createAIProviderFromEnvironment(),
  );
}
