import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { zhCN } from "@/shared/i18n/zh-CN";

export function DashboardLoading() {
  return (
    <div
      aria-label={zhCN.dashboard.loading}
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      role="status"
    >
      <span className="sr-only">{zhCN.dashboard.loading}</span>

      <div className="bg-accent min-h-44 rounded-lg border px-5 py-6 sm:px-7">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>

      <div
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:mt-8 xl:grid-cols-4 xl:gap-5"
        data-testid="loading-statistics"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-36" key={index} />
        ))}
      </div>

      <Card className="mt-6" data-testid="loading-ai-workspace">
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton className="h-12" key={index} />
            ))}
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>

      <div className="mt-6 grid items-start gap-6 xl:mt-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <Card data-testid="loading-recent-meetings">
          <CardContent className="space-y-5 p-6">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton className="h-16 w-full" key={index} />
            ))}
          </CardContent>
        </Card>
        <Card data-testid="loading-quick-actions">
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
