import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "bg-card text-card-foreground rounded-lg border shadow-[var(--shadow-card)]",
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

type CardTitleProps = React.ComponentProps<"h3"> & {
  as?: "h1" | "h2" | "h3" | "h4";
};

export function CardTitle({
  as: Component = "h3",
  className,
  ...props
}: CardTitleProps) {
  return (
    <Component className={cn("text-lg font-semibold", className)} {...props} />
  );
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

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    />
  );
}
