import {
  CalendarDays,
  Archive,
  CalendarRange,
  CheckCircle2,
  CircleDot,
  Layers3,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

type Statistic = {
  id: string;
  label: string;
  value: number;
  context: string;
  icon:
    | "total"
    | "active"
    | "archived"
    | "week"
    | "open-actions"
    | "completed-actions";
};
const icons: Record<Statistic["icon"], LucideIcon> = {
  total: Layers3,
  active: CalendarDays,
  archived: Archive,
  week: CalendarRange,
  "open-actions": CircleDot,
  "completed-actions": CheckCircle2,
};

export function StatisticCard({ statistic }: { statistic: Statistic }) {
  const Icon = icons[statistic.icon];

  return (
    <Card
      data-testid="statistic-card"
      id={statistic.id === "open-actions" ? "open-action-items" : undefined}
    >
      <CardContent className="flex min-h-36 flex-col justify-between p-5">
        <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
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
