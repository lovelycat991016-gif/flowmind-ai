import type { Metadata } from "next";
import { MeetingListControls } from "@/features/meetings/ui/meeting-list-controls";
import { getMeetingsPage } from "@/features/meetings/queries/get-meetings";
import { parseMeetingListState, type MeetingSearchParams } from "@/features/meetings/schemas/meeting-list-state";
import { MeetingList } from "@/widgets/meetings/ui/meeting-list";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<MeetingSearchParams> }) {
  const state = parseMeetingListState(await searchParams);
  const page = await getMeetingsPage(state);
  return <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"><header className="flex items-end justify-between"><div><p className="text-muted-foreground text-sm">Workspace</p><h1 className="mt-1 text-2xl font-semibold">Meetings</h1><p className="text-muted-foreground mt-2 text-sm">Manage your meeting history and lifecycle.</p></div></header><MeetingListControls state={state} /><MeetingList {...page} state={state} /></div>;
}
