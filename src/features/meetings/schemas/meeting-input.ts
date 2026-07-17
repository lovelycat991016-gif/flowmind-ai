import { z } from "zod";

export const meetingTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a meeting title.")
  .max(200, "Meeting titles must be 200 characters or fewer.");

export const meetingIdSchema = z.uuid("The meeting identifier is invalid.");

const localDateSchema = z
  .string()
  .min(1, "Choose a meeting date and time.")
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a valid meeting date and time.");

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
        message: "Choose a valid meeting date and time.",
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
