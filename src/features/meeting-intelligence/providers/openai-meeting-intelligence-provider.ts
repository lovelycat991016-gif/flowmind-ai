import { z } from "zod";

import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";

import type {
  MeetingIntelligenceProvider,
  MeetingIntelligenceRequest,
} from "./meeting-intelligence-provider";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const modelOutputSchema = z.object({
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

type OpenAITransportRequest = {
  url: string;
  headers: { Authorization: string; "Content-Type": string };
  body: string;
};

export type OpenAITransport = (
  request: OpenAITransportRequest,
) => Promise<Response>;

export class OpenAIMeetingIntelligenceProviderError extends Error {
  constructor(readonly code: MeetingIntelligenceFailureCode) {
    super("Unable to generate meeting intelligence.");
    this.name = "OpenAIMeetingIntelligenceProviderError";
  }
}

function mapHttpFailure(status: number): MeetingIntelligenceFailureCode {
  if (status === 429) return "provider_rate_limited";
  if (status === 408 || status === 504) return "provider_timeout";
  if (status >= 500) return "provider_unavailable";
  if ([400, 413, 422].includes(status)) return "provider_rejected_input";
  return "provider_request_failed";
}

function mapTransportFailure(error: unknown): MeetingIntelligenceFailureCode {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "provider_timeout";
  }
  return "provider_request_failed";
}

function createRequestBody(input: MeetingIntelligenceRequest, model: string) {
  return JSON.stringify({
    model,
    instructions:
      "Analyze meeting text. Return JSON only with summary, key_points, decisions, action_items, and risks. key_points, decisions, and risks are arrays of concise strings. Each action item must have task and may include owner and deadline in YYYY-MM-DD format.",
    input: input.transcriptContent,
    text: { format: { type: "json_object" } },
  });
}

function mapOutput(
  raw: unknown,
  input: MeetingIntelligenceRequest,
  model: string,
): MeetingIntelligenceResult {
  const parsed = modelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new OpenAIMeetingIntelligenceProviderError(
      "intelligence_output_invalid",
    );
  }

  const result = meetingIntelligenceResultSchema.safeParse({
    provider: "openai",
    modelIdentifier: model,
    promptVersion: input.promptVersion,
    summary: { content: parsed.data.summary },
    keyPoints: parsed.data.key_points,
    decisions: parsed.data.decisions.map((content) => ({
      content,
      sourceSegmentIndex: null,
    })),
    risks: parsed.data.risks,
    actionItems: parsed.data.action_items.map((item) => ({
      content: item.task,
      assigneeName: item.owner ?? null,
      dueDate: item.deadline ?? null,
      sourceSegmentIndex: null,
    })),
    outputMetadata: { inputSource: "meeting_text" },
  });
  if (!result.success) {
    throw new OpenAIMeetingIntelligenceProviderError(
      "intelligence_output_invalid",
    );
  }
  return result.data;
}

export class OpenAIMeetingIntelligenceProvider implements MeetingIntelligenceProvider {
  private readonly transport: OpenAITransport;

  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      transport?: OpenAITransport;
    },
  ) {
    this.transport =
      options.transport ??
      ((request) =>
        fetch(request.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
        }));
  }

  async generate(
    input: MeetingIntelligenceRequest,
  ): Promise<MeetingIntelligenceResult> {
    let response: Response;
    try {
      response = await this.transport({
        url: OPENAI_RESPONSES_URL,
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: createRequestBody(input, this.options.model),
      });
    } catch (error) {
      throw new OpenAIMeetingIntelligenceProviderError(
        mapTransportFailure(error),
      );
    }

    if (!response.ok) {
      throw new OpenAIMeetingIntelligenceProviderError(
        mapHttpFailure(response.status),
      );
    }

    try {
      const payload = (await response.json()) as { output_text?: unknown };
      if (typeof payload.output_text !== "string") {
        throw new OpenAIMeetingIntelligenceProviderError(
          "intelligence_output_invalid",
        );
      }
      return mapOutput(
        JSON.parse(payload.output_text),
        input,
        this.options.model,
      );
    } catch (error) {
      if (error instanceof OpenAIMeetingIntelligenceProviderError) throw error;
      throw new OpenAIMeetingIntelligenceProviderError(
        "intelligence_output_invalid",
      );
    }
  }
}
