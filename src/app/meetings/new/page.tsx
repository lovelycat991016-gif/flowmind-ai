import type { Metadata } from "next";
import Link from "next/link";
import { CreateMeetingForm } from "@/features/meetings/ui/create-meeting-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { zhCN } from "@/shared/i18n/zh-CN";

export const metadata: Metadata = { title: zhCN.meetings.create };

export default function NewMeetingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        className="text-muted-foreground text-sm hover:underline"
        href="/meetings"
      >
        {zhCN.meetings.backToMeetings}
      </Link>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle as="h1">{zhCN.meetings.create}</CardTitle>
          <CardDescription>{zhCN.meetings.createDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMeetingForm />
        </CardContent>
      </Card>
    </div>
  );
}
