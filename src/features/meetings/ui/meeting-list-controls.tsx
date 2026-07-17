"use client";

import { Plus, Search } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import type { MeetingListState } from "@/features/meetings/schemas/meeting-list-state";
import { buildMeetingListHref } from "@/features/meetings/schemas/meeting-list-state";
import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export function MeetingListControls({ state }: { state: MeetingListState }) {
  const router = useRouter();
  return (
    <div className="bg-card grid gap-4 rounded-lg border p-4 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-end">
      <form action="/meetings" aria-label="Search meetings" className="flex gap-2" role="search">
        <input name="filter" type="hidden" value={state.filter} />
        <input name="sort" type="hidden" value={state.sort} />
        <label className="relative flex-1">
          <span className="sr-only">Search meetings</span>
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <input aria-label="Search meetings" className="border-input bg-background h-10 w-full rounded-md border pr-3 pl-9 text-sm" defaultValue={state.q} name="q" placeholder="Search by title" type="search" />
        </label>
        <button className={buttonVariants({ variant: "secondary" })} type="submit">Search</button>
      </form>
      <div aria-label="Meeting status" className="bg-muted flex h-10 rounded-md p-1">
        {(["active", "archived"] as const).map((filter) => (
          <a aria-current={state.filter === filter ? "page" : undefined} className={cn("flex items-center rounded px-3 text-sm font-medium", state.filter === filter && "bg-card shadow-sm")} href={buildMeetingListHref(state, { filter })} key={filter}>{filter === "active" ? "Active" : "Archived"}</a>
        ))}
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="meeting-sort">Sort meetings</label>
        <select aria-label="Sort meetings" className="border-input bg-background h-10 rounded-md border px-3 text-sm" id="meeting-sort" onChange={(event) => router.push(buildMeetingListHref(state, { sort: event.target.value as MeetingListState["sort"] }) as Route)} value={state.sort}>
          <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="title-asc">Title A-Z</option><option value="title-desc">Title Z-A</option>
        </select>
        <a className={buttonVariants()} href="/meetings/new"><Plus className="size-4" aria-hidden="true" />New meeting</a>
      </div>
    </div>
  );
}
