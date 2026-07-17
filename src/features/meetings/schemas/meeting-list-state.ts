export const meetingFilters = ["active", "archived"] as const;
export const meetingSorts = ["date-desc", "date-asc", "title-asc", "title-desc"] as const;

export type MeetingFilter = (typeof meetingFilters)[number];
export type MeetingSort = (typeof meetingSorts)[number];

export type MeetingListState = {
  q: string;
  filter: MeetingFilter;
  sort: MeetingSort;
  page: number;
};

export type MeetingSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_STATE: MeetingListState = {
  q: "",
  filter: "active",
  sort: "date-desc",
  page: 1,
};

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isOneOf<const T extends readonly string[]>(value: string | undefined, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function parseMeetingListState(params: MeetingSearchParams): MeetingListState {
  const filter = scalar(params.filter);
  const sort = scalar(params.sort);
  const rawPage = scalar(params.page);
  const page = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;

  return {
    q: scalar(params.q)?.trim().slice(0, 200) ?? "",
    filter: isOneOf(filter, meetingFilters) ? filter : DEFAULT_STATE.filter,
    sort: isOneOf(sort, meetingSorts) ? sort : DEFAULT_STATE.sort,
    page: Number.isSafeInteger(page) && page > 0 ? page : DEFAULT_STATE.page,
  };
}

type MeetingListChange = Partial<MeetingListState>;

export function buildMeetingListHref(state: MeetingListState, change: MeetingListChange) {
  const resetsPage = "q" in change || "filter" in change || "sort" in change;
  const next = parseMeetingListState({
    ...state,
    ...change,
    page: resetsPage && !("page" in change) ? "1" : String(change.page ?? state.page),
  });
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  params.set("filter", next.filter);
  params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  return `/meetings?${params.toString()}`;
}
