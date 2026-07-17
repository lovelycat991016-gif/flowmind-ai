"use client";

import { MeetingErrorState } from "@/features/meetings/ui/meeting-error-state";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <MeetingErrorState reset={reset} />;
}
