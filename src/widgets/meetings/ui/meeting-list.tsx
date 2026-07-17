import { Archive, CalendarDays, Inbox } from "lucide-react";
import type { MeetingListItem } from "@/entities/meeting/model/meeting";
import { formatMeetingDate } from "@/entities/meeting/model/meeting";
import type { MeetingListState } from "@/features/meetings/schemas/meeting-list-state";
import { buildMeetingListHref } from "@/features/meetings/schemas/meeting-list-state";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { EmptyPlaceholder } from "@/shared/ui/empty-placeholder";

export function MeetingList({
  meetings,
  hasNextPage,
  state,
}: {
  meetings: ReadonlyArray<MeetingListItem>;
  hasNextPage: boolean;
  state: MeetingListState;
}) {
  if (!meetings.length) {
    const title = state.q
      ? "No meetings match your search"
      : state.filter === "archived"
        ? "No archived meetings"
        : "No active meetings yet";
    return (
      <EmptyPlaceholder
        description={
          state.q
            ? "Try a different meeting title."
            : "Meetings in this view will appear here."
        }
        icon={Inbox}
        title={title}
      />
    );
  }
  return (
    <section
      className="bg-card overflow-hidden rounded-lg border shadow-[var(--shadow-card)]"
      aria-label="Meeting list"
    >
      <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_220px_120px] border-b px-6 py-3 text-xs font-medium md:grid">
        <span>Meeting</span>
        <span>Date</span>
        <span>Status</span>
      </div>
      <ul className="divide-y">
        {meetings.map((meeting) => (
          <li
            className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_220px_120px] md:items-center md:px-6"
            data-testid="meeting-list-row"
            key={meeting.id}
          >
            <a
              className="truncate text-sm font-semibold hover:underline"
              href={`/meetings/${meeting.id}`}
            >
              {meeting.title}
            </a>
            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatMeetingDate(meeting.meetingDate)}
            </span>
            <span>
              {meeting.archivedAt ? (
                <Badge variant="neutral">
                  <Archive className="mr-1 size-3" aria-hidden="true" />
                  Archived
                </Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
      <nav
        aria-label="Meeting pages"
        className="flex items-center justify-between border-t px-5 py-4"
      >
        {state.page > 1 ? (
          <a
            aria-label="Previous page"
            className={buttonVariants({ variant: "outline" })}
            href={buildMeetingListHref(state, { page: state.page - 1 })}
          >
            Previous
          </a>
        ) : (
          <span />
        )}
        <span className="text-muted-foreground text-xs">Page {state.page}</span>
        {hasNextPage ? (
          <a
            aria-label="Next page"
            className={buttonVariants({ variant: "outline" })}
            href={buildMeetingListHref(state, { page: state.page + 1 })}
          >
            Next
          </a>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
