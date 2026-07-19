import { buttonVariants } from "@/shared/ui/button";
import Link from "next/link";

import { zhCN } from "@/shared/i18n/zh-CN";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold">{zhCN.meetings.notFound}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {zhCN.meetings.notFoundDescription}
      </p>
      <Link
        className={`${buttonVariants({ variant: "outline" })} mt-6`}
        href="/meetings"
      >
        {zhCN.meetings.backToMeetings}
      </Link>
    </div>
  );
}
