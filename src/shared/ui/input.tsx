import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-input bg-card placeholder:text-muted-foreground focus-visible:border-ring h-10 w-full rounded-md border px-3 text-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type={type}
      {...props}
    />
  );
}
