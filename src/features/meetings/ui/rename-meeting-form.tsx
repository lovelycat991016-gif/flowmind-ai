"use client";

import { useActionState } from "react";
import { renameMeetingAction } from "@/features/meetings/actions/rename-meeting";
import { INITIAL_MEETING_ACTION_STATE } from "@/features/meetings/actions/meeting-action-state";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zhCN } from "@/shared/i18n/zh-CN";

export function RenameMeetingForm({
  meetingId,
  title,
}: {
  meetingId: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(renameMeetingAction, {
    ...INITIAL_MEETING_ACTION_STATE,
    values: { title, meetingDateLocal: "" },
  });

  return (
    <form
      action={action}
      aria-label={zhCN.meetings.rename}
      className="space-y-3"
    >
      <input name="id" type="hidden" value={meetingId} />
      <div className="space-y-2">
        <Label htmlFor="meeting-title">{zhCN.meetings.titleLabel}</Label>
        <Input
          aria-describedby={
            state.fieldErrors.title ? "rename-title-error" : undefined
          }
          defaultValue={state.values.title}
          id="meeting-title"
          maxLength={200}
          name="title"
          required
        />
        {state.fieldErrors.title ? (
          <p
            className="text-destructive text-sm"
            id="rename-title-error"
            role="alert"
          >
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p
          className={
            state.status === "error"
              ? "text-destructive text-sm"
              : "text-sm text-emerald-700"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? zhCN.meetings.renaming : zhCN.meetings.rename}
      </Button>
    </form>
  );
}
