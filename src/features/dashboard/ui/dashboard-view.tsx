import type { DashboardMeetingData } from "@/entities/meeting/model/meeting";
import { QuickActions } from "@/widgets/dashboard/ui/quick-actions";
import { RecentMeetings } from "@/widgets/dashboard/ui/recent-meetings";
import { StatisticCard } from "@/widgets/dashboard/ui/statistic-card";
import { WelcomeBanner } from "@/widgets/dashboard/ui/welcome-banner";
import { zhCN } from "@/shared/i18n/zh-CN";

export function DashboardView({
  userName,
  data,
}: {
  userName: string;
  data: DashboardMeetingData;
}) {
  const statistics = [
    {
      id: "total",
      label: zhCN.dashboard.totalMeetings,
      value: data.metrics.total,
      context: zhCN.dashboard.totalMeetings,
      icon: "total" as const,
    },
    {
      id: "active",
      label: zhCN.dashboard.activeMeetings,
      value: data.metrics.active,
      context: zhCN.meetings.active,
      icon: "active" as const,
    },
    {
      id: "archived",
      label: zhCN.dashboard.archivedMeetings,
      value: data.metrics.archived,
      context: zhCN.meetings.archived,
      icon: "archived" as const,
    },
    {
      id: "week",
      label: zhCN.dashboard.meetingsThisWeek,
      value: data.metrics.thisWeek,
      context: zhCN.dashboard.activeMeetings,
      icon: "week" as const,
    },
  ];
  const actions = [
    {
      id: "new",
      label: zhCN.dashboard.newMeeting,
      description: zhCN.meetings.createDescription,
      href: "/meetings/new",
      icon: "create" as const,
    },
    {
      id: "all",
      label: zhCN.dashboard.viewMeetings,
      description: zhCN.dashboard.searchAndManage,
      href: "/meetings",
      icon: "history" as const,
    },
  ];
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      id="dashboard-top"
    >
      <WelcomeBanner userName={userName} />

      <section aria-labelledby="overview-heading" className="mt-6 lg:mt-8">
        <h2 className="sr-only" id="overview-heading">
          {zhCN.navigation.dashboard}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
          {statistics.map((statistic) => (
            <StatisticCard key={statistic.id} statistic={statistic} />
          ))}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 xl:mt-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <RecentMeetings meetings={data.recentMeetings} />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <QuickActions actions={actions} />
        </div>
      </div>
    </div>
  );
}
