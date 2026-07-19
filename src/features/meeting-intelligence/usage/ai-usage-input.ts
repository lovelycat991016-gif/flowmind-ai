import { z } from "zod";

import { meetingIntelligenceFailureCodes } from "@/entities/meeting-intelligence/model/meeting-intelligence";

export const aiUsageOperationTypes = [
  "meeting_intelligence_generation",
] as const;

export const aiUsageOutcomes = ["completed", "failed"] as const;

const nullableProvider = z.string().trim().min(1).max(50).nullable();
const nullableModelIdentifier = z.string().trim().min(1).max(100).nullable();
const nullableTokenCount = z
  .number()
  .int()
  .min(0)
  .max(2_147_483_647)
  .nullable();

export const aiUsageEventSchema = z
  .object({
    meetingIntelligenceId: z.uuid(),
    userId: z.uuid(),
    operationType: z.enum(aiUsageOperationTypes),
    attemptNumber: z.number().int().min(1).max(10),
    provider: nullableProvider,
    modelIdentifier: nullableModelIdentifier,
    inputTokens: nullableTokenCount,
    outputTokens: nullableTokenCount,
    estimatedCostMicrounits: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    outcome: z.enum(aiUsageOutcomes),
    failureCode: z.enum(meetingIntelligenceFailureCodes).nullable(),
  })
  .refine(
    ({ failureCode, outcome }) =>
      (outcome === "completed" && failureCode === null) ||
      (outcome === "failed" && failureCode !== null),
    {
      path: ["failureCode"],
      message: "AI usage outcome and failure code do not match.",
    },
  );

export type AiUsageEventInput = z.infer<typeof aiUsageEventSchema>;
