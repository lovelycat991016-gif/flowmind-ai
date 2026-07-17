import type {
  DashboardMeetingData,
  MeetingRow,
} from "@/entities/meeting/model/meeting";
import { mapMeetingRow } from "@/entities/meeting/model/meeting";
import { createClient } from "@/shared/lib/supabase/server";

const MEETING_COLUMNS =
  "id,title,meeting_date,archived_at,created_at,updated_at";

function startOfUtcWeek(now: Date) {
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
    ),
  ).toISOString();
}

export async function getDashboardMeetingData(): Promise<DashboardMeetingData> {
  const supabase = await createClient();
  const totalQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true });
  const activeQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  const archivedQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .not("archived_at", "is", null);
  const thisWeekQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .gte("meeting_date", startOfUtcWeek(new Date()));
  const recentQuery = supabase
    .from("meetings")
    .select(MEETING_COLUMNS)
    .is("archived_at", null)
    .order("meeting_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(4);

  const [total, active, archived, thisWeek, recent] = await Promise.all([
    totalQuery,
    activeQuery,
    archivedQuery,
    thisWeekQuery,
    recentQuery,
  ]);

  if (
    total.error ||
    active.error ||
    archived.error ||
    thisWeek.error ||
    recent.error
  ) {
    throw new Error("Unable to load dashboard meeting data.");
  }

  return {
    metrics: {
      total: total.count ?? 0,
      active: active.count ?? 0,
      archived: archived.count ?? 0,
      thisWeek: thisWeek.count ?? 0,
    },
    recentMeetings: ((recent.data ?? []) as MeetingRow[]).map(mapMeetingRow),
  };
}
