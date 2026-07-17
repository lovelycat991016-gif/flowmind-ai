import { describe, expect, it } from "vitest";

import {
  buildMeetingListHref,
  parseMeetingListState,
} from "./meeting-list-state";

describe("meeting list state", () => {
  it("uses the approved defaults", () => {
    expect(parseMeetingListState({})).toEqual({
      q: "",
      filter: "active",
      sort: "date-desc",
      page: 1,
    });
  });

  it("accepts every approved filter and sort mode", () => {
    for (const sort of [
      "date-desc",
      "date-asc",
      "title-asc",
      "title-desc",
    ] as const) {
      expect(
        parseMeetingListState({ filter: "archived", sort, page: "2" }),
      ).toEqual({
        q: "",
        filter: "archived",
        sort,
        page: 2,
      });
    }
  });

  it("normalizes invalid and array-valued parameters", () => {
    expect(
      parseMeetingListState({
        q: ["one", "two"],
        filter: "unknown",
        sort: "unknown",
        page: "0",
      }),
    ).toEqual({ q: "", filter: "active", sort: "date-desc", page: 1 });
  });

  it("preserves state when changing pages", () => {
    expect(
      buildMeetingListHref(
        { q: "weekly", filter: "archived", sort: "title-asc", page: 2 },
        { page: 3 },
      ),
    ).toBe("/meetings?q=weekly&filter=archived&sort=title-asc&page=3");
  });

  it("resets pagination for search, filter, and sort changes", () => {
    const state = {
      q: "weekly",
      filter: "active",
      sort: "date-desc",
      page: 4,
    } as const;

    expect(buildMeetingListHref(state, { q: "planning" })).not.toContain(
      "page=4",
    );
    expect(buildMeetingListHref(state, { filter: "archived" })).not.toContain(
      "page=4",
    );
    expect(buildMeetingListHref(state, { sort: "title-desc" })).not.toContain(
      "page=4",
    );
  });
});
