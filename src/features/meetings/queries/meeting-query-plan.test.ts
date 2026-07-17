import { describe, expect, it } from "vitest";

import type { MeetingListItem } from "@/entities/meeting/model/meeting";
import { createMeetingQueryPlan, toMeetingPage } from "./meeting-query-plan";

const defaultState = {
  q: "",
  filter: "active",
  sort: "date-desc",
  page: 1,
} as const;

function makeMeeting(index: number): MeetingListItem {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    title: `Meeting ${index}`,
    meetingDate: "2026-07-17T01:30:00.000Z",
    archivedAt: null,
    createdAt: "2026-07-17T01:00:00.000Z",
    updatedAt: "2026-07-17T01:00:00.000Z",
  };
}

describe("meeting query plan", () => {
  it("uses active newest-first defaults and fetches one extra row", () => {
    expect(createMeetingQueryPlan(defaultState)).toEqual({
      archived: false,
      search: "",
      orderColumn: "meeting_date",
      ascending: false,
      from: 0,
      to: 20,
    });
  });

  it("maps all sort modes and page offsets", () => {
    expect(
      createMeetingQueryPlan({ ...defaultState, sort: "date-asc" }),
    ).toMatchObject({
      orderColumn: "meeting_date",
      ascending: true,
    });
    expect(
      createMeetingQueryPlan({ ...defaultState, sort: "title-asc" }),
    ).toMatchObject({
      orderColumn: "title",
      ascending: true,
    });
    expect(
      createMeetingQueryPlan({
        q: " weekly ",
        filter: "archived",
        sort: "title-desc",
        page: 3,
      }),
    ).toEqual({
      archived: true,
      search: "weekly",
      orderColumn: "title",
      ascending: false,
      from: 40,
      to: 60,
    });
  });

  it("returns twenty rows and a next-page signal", () => {
    const page = toMeetingPage(
      Array.from({ length: 21 }, (_, index) => makeMeeting(index)),
    );

    expect(page.meetings).toHaveLength(20);
    expect(page.hasNextPage).toBe(true);
  });

  it("does not report a next page for twenty or fewer rows", () => {
    expect(
      toMeetingPage(
        Array.from({ length: 20 }, (_, index) => makeMeeting(index)),
      ),
    ).toMatchObject({
      hasNextPage: false,
    });
  });
});
