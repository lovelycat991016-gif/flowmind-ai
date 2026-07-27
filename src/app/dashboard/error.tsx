"use client";

import { Button } from "@/shared/ui/button";
import { zhCN } from "@/shared/i18n/zh-CN";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" role="alert">
      <p className="text-muted-foreground text-sm">
        {zhCN.dashboard.aiWorkspaceLoadFailed}
      </p>
      <Button className="mt-4" onClick={reset} type="button">
        {zhCN.common.retry}
      </Button>
    </div>
  );
}
