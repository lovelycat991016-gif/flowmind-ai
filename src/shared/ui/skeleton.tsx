import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      data-testid="skeleton"
      {...props}
    />
  );
}
