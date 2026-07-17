import type { MeetingDetail, MeetingRow } from "@/entities/meeting/model/meeting";
import { mapMeetingRow } from "@/entities/meeting/model/meeting";
import { createMeetingQueryPlan, toMeetingPage } from "@/features/meetings/queries/meeting-query-plan";
import type { MeetingListState } from "@/features/meetings/schemas/meeting-list-state";
import { createClient } from "@/shared/lib/supabase/server";

const MEETING_COLUMNS =
  "id,title,meeting_date,archived_at,created_at,updated_at";

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function getMeetingsPage(state: MeetingListState) {
  const supabase = await createClient();
  const plan = createMeetingQueryPlan(state);
  let query = supabase.from("meetings").select(MEETING_COLUMNS);

  query = plan.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  if (plan.search) {
    query = query.ilike("title", `%${escapeIlike(plan.search)}%`);
  }

  const { data, error } = await query
    .order(plan.orderColumn, { ascending: plan.ascending })
    .order("id", { ascending: plan.ascending })
    .range(plan.from, plan.to);

  if (error) throw new Error("Unable to load meetings.");

  return toMeetingPage(((data ?? []) as MeetingRow[]).map(mapMeetingRow));
}

export async function getMeetingById(id: string): Promise<MeetingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Unable to load this meeting.");
  return data ? mapMeetingRow(data as MeetingRow) : null;
}
