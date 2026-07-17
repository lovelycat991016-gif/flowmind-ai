import { describe, expect, it } from "vitest";

import {
  createMeetingSchema,
  meetingIdSchema,
  meetingTitleSchema,
  renameMeetingSchema,
} from "./meeting-input";

describe("meeting input schemas", () => {
  it("trims and validates meeting titles", () => {
    expect(meetingTitleSchema.parse("  Product weekly  ")).toBe("Product weekly");
    expect(meetingTitleSchema.safeParse("   ").success).toBe(false);
    expect(meetingTitleSchema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("converts a browser-local date into an ISO timestamp", () => {
    const result = createMeetingSchema.parse({
      title: "Planning",
      meetingDateLocal: "2026-07-17T09:30",
      timezoneOffset: "-480",
    });

    expect(result).toEqual({
      title: "Planning",
      meetingDate: "2026-07-17T01:30:00.000Z",
    });
  });

  it("rejects invalid dates and timezone offsets", () => {
    expect(
      createMeetingSchema.safeParse({
        title: "Planning",
        meetingDateLocal: "not-a-date",
        timezoneOffset: "-480",
      }).success,
    ).toBe(false);
    expect(
      createMeetingSchema.safeParse({
        title: "Planning",
        meetingDateLocal: "2026-07-17T09:30",
        timezoneOffset: "invalid",
      }).success,
    ).toBe(false);
  });

  it("validates rename and lifecycle identifiers", () => {
    const id = "6b79f5f3-f083-4a75-b74b-41342f2b1454";

    expect(renameMeetingSchema.parse({ id, title: " Renamed " })).toEqual({
      id,
      title: "Renamed",
    });
    expect(meetingIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
