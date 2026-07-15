import { Inbox } from "lucide-react";

import {
  dashboardQuickActions,
  dashboardStatistics,
  recentMeetings,
} from "@/features/dashboard/model/dashboard-mock-data";
import { EmptyPlaceholder } from "@/shared/ui/empty-placeholder";
import { QuickActions } from "@/widgets/dashboard/ui/quick-actions";
import { RecentMeetings } from "@/widgets/dashboard/ui/recent-meetings";
import { StatisticCard } from "@/widgets/dashboard/ui/statistic-card";
import { WelcomeBanner } from "@/widgets/dashboard/ui/welcome-banner";

export function DashboardView({ userName }: { userName: string }) {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      id="dashboard-top"
    >
      <WelcomeBanner userName={userName} />

      <section aria-labelledby="overview-heading" className="mt-6 lg:mt-8">
        <h2 className="sr-only" id="overview-heading">
          Dashboard overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
          {dashboardStatistics.map((statistic) => (
            <StatisticCard key={statistic.id} statistic={statistic} />
          ))}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 xl:mt-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <RecentMeetings meetings={recentMeetings} />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
          <QuickActions actions={dashboardQuickActions} />
          <section aria-labelledby="processing-heading" id="processing-empty">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" id="processing-heading">
                  Processing queue
                </h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  Live upload status
                </p>
              </div>
            </div>
            <EmptyPlaceholder
              className="min-h-48"
              description="New uploads will appear here while they are being prepared."
              icon={Inbox}
              title="No recordings in progress"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
