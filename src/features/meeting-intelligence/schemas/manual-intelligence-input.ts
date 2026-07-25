import { z } from "zod";

import { zhCN } from "@/shared/i18n/zh-CN";

export const MAX_MANUAL_INTELLIGENCE_INPUT_LENGTH = 100_000;

export const manualIntelligenceInputSchema = z.object({
  meetingId: z.uuid(zhCN.intelligence.inputMeetingInvalid),
  inputText: z
    .string()
    .trim()
    .min(1, zhCN.intelligence.inputRequired)
    .max(MAX_MANUAL_INTELLIGENCE_INPUT_LENGTH, zhCN.intelligence.inputTooLong),
});
