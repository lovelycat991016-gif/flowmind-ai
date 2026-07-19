"use client";

import { Button } from "@/shared/ui/button";
import { zhCN } from "@/shared/i18n/zh-CN";

export function MeetingErrorState({
  reset,
  detail = false,
}: {
  reset: () => void;
  detail?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">
        {detail ? zhCN.meetings.unavailableDetail : zhCN.meetings.unavailable}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {zhCN.meetings.retryDescription}
      </p>
      <Button className="mt-6" onClick={reset} type="button">
        {zhCN.common.retry}
      </Button>
    </div>
  );
}
