import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return <header className={cn("space-y-2 px-6 pt-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("text-2xl font-semibold", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-sm leading-6", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-6", className)} {...props} />;
}
