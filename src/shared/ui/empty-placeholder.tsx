import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

type EmptyPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyPlaceholder({
  action,
  className,
  description,
  icon: Icon,
  title,
}: EmptyPlaceholderProps) {
  return (
    <div
      className={cn(
        "border-border bg-panel flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center",
        className,
      )}
      role="status"
    >
      <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-xs text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
