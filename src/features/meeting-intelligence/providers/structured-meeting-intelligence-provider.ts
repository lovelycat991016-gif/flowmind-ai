import type {
  MeetingIntelligenceFailureCode,
  MeetingIntelligenceResult,
} from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";
import type {
  MeetingIntelligenceProvider,
  MeetingIntelligenceRequest,
} from "./meeting-intelligence-provider";

export type MeetingIntelligenceTransport = (
  input: MeetingIntelligenceRequest,
) => Promise<string>;

export class MeetingIntelligenceProviderError extends Error {
  constructor(readonly code: MeetingIntelligenceFailureCode) {
    super("Unable to generate meeting intelligence.");
    this.name = "MeetingIntelligenceProviderError";
  }
}

function mapTransportError(error: unknown): MeetingIntelligenceFailureCode {
  if (error instanceof DOMException && error.name === "AbortError")
    return "provider_timeout";
  return "provider_request_failed";
}

export class StructuredMeetingIntelligenceProvider implements MeetingIntelligenceProvider {
  constructor(
    private readonly options: { transport: MeetingIntelligenceTransport },
  ) {}

  async generate(
    input: MeetingIntelligenceRequest,
  ): Promise<MeetingIntelligenceResult> {
    let raw: string;
    try {
      raw = await this.options.transport(input);
    } catch (error) {
      throw new MeetingIntelligenceProviderError(mapTransportError(error));
    }

    try {
      const result = meetingIntelligenceResultSchema.safeParse(JSON.parse(raw));
      if (
        !result.success ||
        result.data.promptVersion !== input.promptVersion
      ) {
        throw new MeetingIntelligenceProviderError(
          "intelligence_output_invalid",
        );
      }
      return result.data;
    } catch (error) {
      if (error instanceof MeetingIntelligenceProviderError) throw error;
      throw new MeetingIntelligenceProviderError("intelligence_output_invalid");
    }
  }
}
