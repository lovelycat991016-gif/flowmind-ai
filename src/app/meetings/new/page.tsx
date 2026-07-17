import type { Metadata } from "next";
import { CreateMeetingForm } from "@/features/meetings/ui/create-meeting-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export const metadata: Metadata = { title: "New meeting" };

export default function NewMeetingPage() {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10"><a className="text-muted-foreground text-sm hover:underline" href="/meetings">Back to meetings</a><Card className="mt-6"><CardHeader><CardTitle as="h1">Create meeting</CardTitle><CardDescription>Add the meeting title and when it takes place.</CardDescription></CardHeader><CardContent><CreateMeetingForm /></CardContent></Card></div>;
}
