"use client";

import { Plus, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { MeetingListState } from "@/features/meetings/schemas/meeting-list-state";
import { buildMeetingListHref } from "@/features/meetings/schemas/meeting-list-state";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { zhCN } from "@/shared/i18n/zh-CN";

export function MeetingListControls({ state }: { state: MeetingListState }) {
  const router = useRouter();
  return (
    <div className="bg-card grid gap-4 rounded-lg border p-4 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-end">
      <form
        action="/meetings"
        aria-label={zhCN.meetings.search}
        className="flex gap-2"
        role="search"
      >
        <input name="filter" type="hidden" value={state.filter} />
        <input name="sort" type="hidden" value={state.sort} />
        <label className="relative flex-1">
          <span className="sr-only">{zhCN.meetings.search}</span>
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            aria-label={zhCN.meetings.search}
            className="border-input bg-background h-10 w-full rounded-md border pr-3 pl-9 text-sm"
            defaultValue={state.q}
            name="q"
            placeholder={zhCN.meetings.searchByTitle}
            type="search"
          />
        </label>
        <button
          className={buttonVariants({ variant: "secondary" })}
          type="submit"
        >
          {zhCN.meetings.search}
        </button>
      </form>
      <div
        aria-label={zhCN.meetings.status}
        className="bg-muted flex h-10 rounded-md p-1"
      >
        {(["active", "archived"] as const).map((filter) => (
          <a
            aria-current={state.filter === filter ? "page" : undefined}
            className={cn(
              "flex items-center rounded px-3 text-sm font-medium",
              state.filter === filter && "bg-card shadow-sm",
            )}
            href={buildMeetingListHref(state, { filter })}
            key={filter}
          >
            {filter === "active"
              ? zhCN.meetings.active
              : zhCN.meetings.archived}
          </a>
        ))}
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="meeting-sort">
          {zhCN.meetings.sort}
        </label>
        <select
          aria-label={zhCN.meetings.sort}
          className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          id="meeting-sort"
          onChange={(event) =>
            router.push(
              buildMeetingListHref(state, {
                sort: event.target.value as MeetingListState["sort"],
              }) as Route,
            )
          }
          value={state.sort}
        >
          <option value="date-desc">{zhCN.meetings.newest}</option>
          <option value="date-asc">{zhCN.meetings.oldest}</option>
          <option value="title-asc">{zhCN.meetings.titleAsc}</option>
          <option value="title-desc">{zhCN.meetings.titleDesc}</option>
        </select>
        <Link className={buttonVariants()} href="/meetings/new">
          <Plus className="size-4" aria-hidden="true" />
          {zhCN.meetings.create}
        </Link>
      </div>
    </div>
  );
}
