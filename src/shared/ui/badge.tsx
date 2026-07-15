import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-success-muted text-success",
        info: "bg-info-muted text-info",
        warning: "bg-warning-muted text-warning",
        outline: "border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ className, variant }))}
      data-variant={variant}
      {...props}
    />
  );
}
