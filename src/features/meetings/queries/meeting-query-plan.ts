import type { MeetingListItem, MeetingPage } from "@/entities/meeting/model/meeting";
import type { MeetingListState } from "@/features/meetings/schemas/meeting-list-state";

export const MEETINGS_PAGE_SIZE = 20;

export type MeetingQueryPlan = {
  archived: boolean;
  search: string;
  orderColumn: "meeting_date" | "title";
  ascending: boolean;
  from: number;
  to: number;
};

export function createMeetingQueryPlan(state: MeetingListState): MeetingQueryPlan {
  const titleSort = state.sort.startsWith("title");
  const ascending = state.sort.endsWith("asc");
  const from = (state.page - 1) * MEETINGS_PAGE_SIZE;

  return {
    archived: state.filter === "archived",
    search: state.q.trim(),
    orderColumn: titleSort ? "title" : "meeting_date",
    ascending,
    from,
    to: from + MEETINGS_PAGE_SIZE,
  };
}

export function toMeetingPage(meetings: ReadonlyArray<MeetingListItem>): MeetingPage {
  return {
    meetings: meetings.slice(0, MEETINGS_PAGE_SIZE),
    hasNextPage: meetings.length > MEETINGS_PAGE_SIZE,
  };
}
