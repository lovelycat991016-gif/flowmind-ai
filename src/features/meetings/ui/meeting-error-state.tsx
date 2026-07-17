"use client";

import { Button } from "@/shared/ui/button";

export function MeetingErrorState({ reset, detail = false }: { reset: () => void; detail?: boolean }) {
  return <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
    <h1 className="text-xl font-semibold">{detail ? "Unable to load this meeting" : "Unable to load meetings"}</h1>
    <p className="text-muted-foreground mt-2 text-sm">Please try again. If the problem continues, return to your dashboard.</p>
    <Button className="mt-6" onClick={reset} type="button">Try again</Button>
  </div>;
}
