import Link from "next/link";
import type { DashboardAttention } from "@/features/dashboard/queries/get-dashboard-attention";
import { t, zhCN } from "@/shared/i18n/zh-CN";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const statusLabels = {
  queued: zhCN.intelligence.statusQueued,
  running: zhCN.intelligence.statusRunning,
  completed: zhCN.intelligence.statusCompleted,
  failed: zhCN.intelligence.statusFailed,
  cancelled: zhCN.intelligence.statusCancelled,
} as const;

export function AiAttentionPanel({
  attention,
}: {
  attention: DashboardAttention;
}) {
  const isEmpty =
    attention.todayMeetingCount === 0 &&
    attention.completedIntelligenceCount === 0 &&
    attention.openTaskCount === 0 &&
    attention.riskReminders.length === 0 &&
    attention.recentDecisions.length === 0 &&
    attention.recentActivities.length === 0;

  return (
    <Card id="ai-workspace">
      <CardHeader>
        <CardTitle as="h2">{zhCN.dashboard.aiWorkspace}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isEmpty ? (
          <p className="text-muted-foreground text-sm" role="status">
            {zhCN.dashboard.aiWorkspaceEmpty}
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <p className="bg-muted rounded-md p-3 text-sm">
                {t("dashboard", "todayMeetings", {
                  count: attention.todayMeetingCount,
                })}
              </p>
              <p className="bg-muted rounded-md p-3 text-sm">
                {t("dashboard", "completedAiAnalyses", {
                  count: attention.completedIntelligenceCount,
                })}
              </p>
              <p className="bg-muted rounded-md p-3 text-sm">
                {t("dashboard", "openActionItems", {
                  count: attention.openTaskCount,
                })}
              </p>
            </div>
            <AttentionList
              empty={zhCN.dashboard.noRisks}
              items={attention.riskReminders}
              title={zhCN.dashboard.riskReminders}
            />
            <AttentionList
              empty={zhCN.dashboard.noDecisions}
              items={attention.recentDecisions}
              title={zhCN.dashboard.recentDecisions}
            />
            <section>
              <h3 className="text-sm font-medium">
                {zhCN.dashboard.recentAiActivities}
              </h3>
              {attention.recentActivities.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {zhCN.dashboard.noAiActivities}
                </p>
              ) : (
                <ul
                  aria-label={zhCN.dashboard.recentAiActivities}
                  className="mt-2 space-y-2"
                >
                  {attention.recentActivities.map((activity) => (
                    <li
                      className="text-sm"
                      key={`${activity.meetingId}-${activity.updatedAt}`}
                    >
                      <Link
                        className="hover:underline"
                        href={`/meetings/${activity.meetingId}`}
                      >
                        {activity.meetingTitle}
                      </Link>
                      <span className="text-muted-foreground" role="status">
                        {` · ${statusLabels[activity.status]}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: { meetingId: string; meetingTitle: string; content: string }[];
  title: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">{empty}</p>
      ) : (
        <ul
          aria-label={title}
          className="mt-2 list-disc space-y-1 pl-5 text-sm"
        >
          {items.map((item) => (
            <li key={`${item.meetingId}-${item.content}`}>
              <Link
                className="hover:underline"
                href={`/meetings/${item.meetingId}`}
              >
                {item.meetingTitle}
              </Link>
              {`：${item.content}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
