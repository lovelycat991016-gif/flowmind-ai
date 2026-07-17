import {
  ArrowRight,
  CalendarPlus,
  History,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

const icons: Record<QuickAction["icon"], LucideIcon> = {
  create: CalendarPlus,
  history: History,
};
type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: "create" | "history";
};

export function QuickActions({
  actions,
}: {
  actions: ReadonlyArray<QuickAction>;
}) {
  return (
    <Card id="quick-actions">
      <CardHeader className="px-5 pt-5 sm:px-6">
        <CardTitle as="h2">Quick actions</CardTitle>
        <CardDescription>
          Move directly to common dashboard tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-3 pb-3 sm:px-4">
        <ul className="divide-border divide-y">
          {actions.map((action) => {
            const Icon = icons[action.icon];
            return (
              <li key={action.id}>
                <a
                  className="hover:bg-muted flex min-h-16 items-center gap-3 rounded-md px-2.5 py-3 transition-colors"
                  href={action.href}
                >
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {action.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
