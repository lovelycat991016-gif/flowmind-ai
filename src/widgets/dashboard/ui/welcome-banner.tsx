import { ArrowRight, CalendarPlus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

export function WelcomeBanner({ userName }: { userName: string }) {
  return (
    <section
      aria-labelledby="dashboard-welcome-title"
      className="bg-accent border-border flex flex-col justify-between gap-6 rounded-lg border px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-center lg:px-8"
    >
      <div className="max-w-2xl">
        <p className="text-accent-foreground text-sm font-medium">
          Wednesday, July 15
        </p>
        <h1
          className="mt-2 text-2xl leading-tight font-semibold sm:text-[28px]"
          id="dashboard-welcome-title"
        >
          Good morning, {userName}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6 sm:text-base">
          Your meetings are organized and ready for review.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          className={cn(buttonVariants({ size: "lg" }), "min-w-40")}
          href="/meetings/new"
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          New meeting
        </Link>
        <Link
          className={buttonVariants({ size: "lg", variant: "outline" })}
          href="/meetings"
        >
          View meetings
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
