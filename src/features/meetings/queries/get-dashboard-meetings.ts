import type {
  DashboardMeetingData,
  MeetingRow,
} from "@/entities/meeting/model/meeting";
import { mapMeetingRow } from "@/entities/meeting/model/meeting";
import { createClient } from "@/shared/lib/supabase/server";
import {
  createSupabaseErrorDiagnostic,
  type DashboardQuery,
  type DashboardTable,
  reportServerEvent,
} from "@/shared/observability/server";

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

async function reportDashboardQueryFailures(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  failures: Array<{ table: DashboardTable; query: DashboardQuery; error: unknown }>;
  startedAt: number;
}) {
  let authenticatedUserPresent = false;
  try {
    const { data } = await input.supabase.auth.getUser();
    authenticatedUserPresent = Boolean(data.user);
  } catch {
    // Preserve the original query failure and report session absence safely.
  }
  for (const failure of input.failures) {
    reportServerEvent({
      category: "supabase",
      operation: "dashboard_meeting_query",
      outcome: "failure",
      failureCode: "supabase_query_failed",
      durationMs: Date.now() - input.startedAt,
      supabaseDiagnostic: createSupabaseErrorDiagnostic({
        ...failure,
        authenticatedUserPresent,
      }),
    });
  }
}

export async function getDashboardMeetingData(): Promise<DashboardMeetingData> {
  const startedAt = Date.now();
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
  const openTasksQuery = supabase
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);
  const completedTasksQuery = supabase
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  const [total, active, archived, thisWeek, recent, openTasks, completedTasks] =
    await Promise.all([
      totalQuery,
      activeQuery,
      archivedQuery,
      thisWeekQuery,
      recentQuery,
      openTasksQuery,
      completedTasksQuery,
    ]);

  const failures = [
    { table: "meetings", query: "meetings_total", error: total.error },
    { table: "meetings", query: "meetings_active", error: active.error },
    { table: "meetings", query: "meetings_archived", error: archived.error },
    { table: "meetings", query: "meetings_this_week", error: thisWeek.error },
    { table: "meetings", query: "meetings_recent", error: recent.error },
    { table: "action_items", query: "action_items_open", error: openTasks.error },
    { table: "action_items", query: "action_items_completed", error: completedTasks.error },
  ].filter((failure) => Boolean(failure.error)) as Array<{
    table: DashboardTable;
    query: DashboardQuery;
    error: unknown;
  }>;
  if (failures.length > 0) {
    await reportDashboardQueryFailures({ supabase, failures, startedAt });
    throw new Error("Unable to load dashboard meeting data.");
  }

  return {
    metrics: {
      total: total.count ?? 0,
      active: active.count ?? 0,
      archived: archived.count ?? 0,
      thisWeek: thisWeek.count ?? 0,
      openTasks: openTasks.count ?? 0,
      completedTasks: completedTasks.count ?? 0,
    },
    recentMeetings: ((recent.data ?? []) as MeetingRow[]).map(mapMeetingRow),
  };
}
