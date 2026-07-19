"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { createMeetingAction } from "@/features/meetings/actions/create-meeting";
import {
  INITIAL_MEETING_ACTION_STATE,
  type MeetingActionState,
} from "@/features/meetings/actions/meeting-action-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zhCN } from "@/shared/i18n/zh-CN";

export function CreateMeetingForm({
  initialState = INITIAL_MEETING_ACTION_STATE,
}: {
  initialState?: MeetingActionState;
}) {
  const [state, action, pending] = useActionState(
    createMeetingAction,
    initialState,
  );
  const timezoneRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (timezoneRef.current)
      timezoneRef.current.value = String(new Date().getTimezoneOffset());
  }, []);
  return (
    <form action={action} className="space-y-5">
      <input
        name="timezoneOffset"
        ref={timezoneRef}
        type="hidden"
        defaultValue="0"
      />
      <div className="space-y-2">
        <Label htmlFor="meeting-title">{zhCN.meetings.titleLabel}</Label>
        <Input
          aria-describedby={state.fieldErrors.title ? "title-error" : undefined}
          defaultValue={state.values.title}
          id="meeting-title"
          maxLength={200}
          name="title"
          required
        />
        {state.fieldErrors.title ? (
          <p className="text-destructive text-sm" id="title-error" role="alert">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="meeting-date">{zhCN.meetings.dateLabel}</Label>
        <Input
          aria-describedby={
            state.fieldErrors.meetingDateLocal ? "date-error" : undefined
          }
          defaultValue={state.values.meetingDateLocal}
          id="meeting-date"
          name="meetingDateLocal"
          required
          type="datetime-local"
        />
        {state.fieldErrors.meetingDateLocal ? (
          <p className="text-destructive text-sm" id="date-error" role="alert">
            {state.fieldErrors.meetingDateLocal}
          </p>
        ) : null}
      </div>
      {state.message && !Object.keys(state.fieldErrors).length ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button disabled={pending} type="submit">
          {pending ? zhCN.meetings.creating : zhCN.meetings.create}
        </Button>
        <Link
          className="inline-flex h-10 items-center px-3 text-sm font-medium"
          href="/meetings"
        >
          {zhCN.common.cancel}
        </Link>
      </div>
    </form>
  );
}
