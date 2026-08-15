"use client";

import { useActionState } from "react";

import { createManualIntelligenceAction } from "@/features/meeting-intelligence/actions/create-manual-intelligence";
import {
  INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
  type ManualIntelligenceActionState,
} from "@/features/meeting-intelligence/actions/manual-intelligence-action-state";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";

export function ManualIntelligenceForm({
  archived = false,
  initialState = INITIAL_MANUAL_INTELLIGENCE_ACTION_STATE,
  meetingId,
}: {
  archived?: boolean;
  initialState?: ManualIntelligenceActionState;
  meetingId: string;
}) {
  const [state, action, pending] = useActionState(
    createManualIntelligenceAction,
    initialState,
  );

  if (archived) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.intelligence.generate}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input name="meetingId" type="hidden" value={meetingId} />
          <div className="space-y-2">
            <Label htmlFor="manual-intelligence-input">
              {zhCN.intelligence.inputLabel}
            </Label>
            <textarea
              aria-describedby={
                state.message ? "manual-intelligence-status" : undefined
              }
              className="border-input bg-background focus-visible:ring-ring min-h-36 w-full rounded-md border px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2"
              defaultValue={state.value}
              id="manual-intelligence-input"
              name="inputText"
              placeholder={zhCN.intelligence.inputPlaceholder}
              required
            />
          </div>
          {state.message ? (
            <p
              className={
                state.status === "error"
                  ? "text-destructive text-sm"
                  : "text-muted-foreground text-sm"
              }
              id="manual-intelligence-status"
              role={state.status === "error" ? "alert" : "status"}
            >
              {state.message}
            </p>
          ) : null}
          <Button disabled={pending} type="submit">
            {pending
              ? zhCN.intelligence.generating
              : zhCN.intelligence.generate}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
