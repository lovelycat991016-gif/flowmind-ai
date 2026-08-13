import type { MeetingIntelligenceGenerationStatus } from "@/entities/meeting-intelligence/model/meeting-intelligence";
import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";
import { reportServerEvent } from "@/shared/observability/server";
import {
  createSupabaseErrorDiagnostic,
  type DashboardQuery,
  type DashboardTable,
} from "@/shared/observability/server";
import { createClient } from "@/shared/lib/supabase/server";

export type DashboardAttention = {
  todayMeetingCount: number;
  completedIntelligenceCount: number;
  openTaskCount: number;
  riskReminders: { meetingId: string; meetingTitle: string; content: string }[];
  recentDecisions: {
    meetingId: string;
    meetingTitle: string;
    content: string;
  }[];
  recentActivities: {
    meetingId: string;
    meetingTitle: string;
    status: MeetingIntelligenceGenerationStatus;
    updatedAt: string;
  }[];
};

function utcDayRange(now: Date) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
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

export async function getDashboardAttention(): Promise<DashboardAttention> {
  const startedAt = Date.now();
  const supabase = await createClient();
  const today = utcDayRange(new Date());
  const todayMeetingsQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .gte("meeting_date", today.start)
    .lt("meeting_date", today.end);
  const completedIntelligenceQuery = supabase
    .from("meeting_intelligence")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");
  const openTasksQuery = supabase
    .from("action_items")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);
  const intelligenceQuery = supabase
    .from("meeting_intelligence")
    .select("id,meeting_id,status,result,updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);

  const [todayMeetings, completedIntelligence, openTasks, intelligence] =
    await Promise.all([
      todayMeetingsQuery,
      completedIntelligenceQuery,
      openTasksQuery,
      intelligenceQuery,
    ]);
  const failures = [
    { table: "meetings", query: "meetings_today", error: todayMeetings.error },
    { table: "meeting_intelligence", query: "intelligence_completed", error: completedIntelligence.error },
    { table: "action_items", query: "action_items_open", error: openTasks.error },
    { table: "meeting_intelligence", query: "intelligence_recent", error: intelligence.error },
  ].filter((failure) => Boolean(failure.error)) as Array<{
    table: DashboardTable;
    query: DashboardQuery;
    error: unknown;
  }>;
  if (failures.length > 0) {
    await reportDashboardQueryFailures({ supabase, failures, startedAt });
    throw new Error("Unable to load dashboard AI workspace data.");
  }

  const rows = (intelligence.data ?? []) as {
    id: string;
    meeting_id: string;
    status: MeetingIntelligenceGenerationStatus;
    result: unknown;
    updated_at: string;
  }[];
  const meetingIds = [...new Set(rows.map((row) => row.meeting_id))];
  const meetingTitles = new Map<string, string>();
  if (meetingIds.length > 0) {
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("id,title")
      .in("id", meetingIds);
    if (error) {
      await reportDashboardQueryFailures({
        supabase,
        failures: [
          {
            table: "meetings",
            query: "meetings_for_intelligence",
            error,
          },
        ],
        startedAt,
      });
      throw new Error("Unable to load dashboard AI workspace data.");
    }
    for (const meeting of meetings ?? [])
      meetingTitles.set(meeting.id, meeting.title);
  }

  const visibleRows = rows.filter((row) => meetingTitles.has(row.meeting_id));
  const completedRows = visibleRows.flatMap((row) => {
    const result = meetingIntelligenceResultSchema.safeParse(row.result);
    return row.status === "completed" && result.success
      ? [{ row, result: result.data }]
      : [];
  });
  const titleFor = (meetingId: string) => meetingTitles.get(meetingId) ?? "";

  return {
    todayMeetingCount: todayMeetings.count ?? 0,
    completedIntelligenceCount: completedIntelligence.count ?? 0,
    openTaskCount: openTasks.count ?? 0,
    riskReminders: completedRows
      .flatMap(({ row, result }) =>
        result.risks.map((content) => ({
          meetingId: row.meeting_id,
          meetingTitle: titleFor(row.meeting_id),
          content,
        })),
      )
      .slice(0, 3),
    recentDecisions: completedRows
      .flatMap(({ row, result }) =>
        result.decisions.map((decision) => ({
          meetingId: row.meeting_id,
          meetingTitle: titleFor(row.meeting_id),
          content: decision.content,
        })),
      )
      .slice(0, 3),
    recentActivities: visibleRows.slice(0, 5).map((row) => ({
      meetingId: row.meeting_id,
      meetingTitle: titleFor(row.meeting_id),
      status: row.status,
      updatedAt: row.updated_at,
    })),
  };
}
