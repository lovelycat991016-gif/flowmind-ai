import { z } from "zod";
import { zhCN } from "@/shared/i18n/zh-CN";

export const meetingTitleSchema = z
  .string()
  .trim()
  .min(1, zhCN.meetings.validation.titleRequired)
  .max(200, zhCN.meetings.validation.titleTooLong);

export const meetingIdSchema = z.uuid(zhCN.meetings.validation.idInvalid);

const localDateSchema = z
  .string()
  .min(1, zhCN.meetings.validation.dateRequired)
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    zhCN.meetings.validation.dateInvalid,
  );

const timezoneOffsetSchema = z.coerce.number().int().min(-840).max(840);

export const createMeetingSchema = z
  .object({
    title: meetingTitleSchema,
    meetingDateLocal: localDateSchema,
    timezoneOffset: timezoneOffsetSchema,
  })
  .transform(({ meetingDateLocal, timezoneOffset, title }, context) => {
    const localAsUtc = Date.parse(`${meetingDateLocal}:00.000Z`);

    if (!Number.isFinite(localAsUtc)) {
      context.addIssue({
        code: "custom",
        message: zhCN.meetings.validation.dateInvalid,
        path: ["meetingDateLocal"],
      });
      return z.NEVER;
    }

    return {
      title,
      meetingDate: new Date(localAsUtc + timezoneOffset * 60_000).toISOString(),
    };
  });

export const renameMeetingSchema = z.object({
  id: meetingIdSchema,
  title: meetingTitleSchema,
});
