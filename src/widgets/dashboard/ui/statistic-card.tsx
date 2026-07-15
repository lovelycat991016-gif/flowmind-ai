import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

import type {
  DashboardStatistic,
  StatisticIcon,
  StatisticTone,
} from "@/features/dashboard/model/dashboard-mock-data";
import { Card, CardContent } from "@/shared/ui/card";

const icons: Record<StatisticIcon, LucideIcon> = {
  meetings: CalendarDays,
  time: Clock3,
  actions: ListChecks,
  completion: CheckCircle2,
};

const toneClasses: Record<StatisticTone, string> = {
  success: "bg-success-muted text-success",
  info: "bg-info-muted text-info",
  warning: "bg-warning-muted text-warning",
  neutral: "bg-muted text-muted-foreground",
};

export function StatisticCard({
  statistic,
}: {
  statistic: DashboardStatistic;
}) {
  const Icon = icons[statistic.icon];

  return (
    <Card
      data-testid="statistic-card"
      id={statistic.id === "open-actions" ? "open-action-items" : undefined}
    >
      <CardContent className="flex min-h-36 flex-col justify-between p-5">
        <div
          className={`flex size-9 items-center justify-center rounded-md ${toneClasses[statistic.tone]}`}
        >
          <Icon aria-hidden="true" className="size-4" />
        </div>
        <div className="mt-5">
          <p className="text-2xl font-semibold tabular-nums">
            {statistic.value}
          </p>
          <p className="mt-1 text-sm font-medium">{statistic.label}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {statistic.context}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
