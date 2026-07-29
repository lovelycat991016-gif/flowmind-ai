"use client";

import { useActionState } from "react";

import type { MeetingAiMessage } from "@/entities/meeting-ai-message/model/meeting-ai-message";
import {
  INITIAL_MEETING_COPILOT_ACTION_STATE,
  sendMeetingCopilotMessageAction,
  type MeetingCopilotActionState,
} from "@/features/meeting-copilot/actions/send-meeting-copilot-message";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";

export function MeetingCopilotSection({
  archived = false,
  initialState = INITIAL_MEETING_COPILOT_ACTION_STATE,
  meetingId,
  messages,
}: {
  archived?: boolean;
  initialState?: MeetingCopilotActionState;
  meetingId: string;
  messages: MeetingAiMessage[];
}) {
  const [state, action, pending] = useActionState(
    sendMeetingCopilotMessageAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.copilot.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          aria-label={zhCN.copilot.conversation}
          className="space-y-3"
          role="log"
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {zhCN.copilot.empty}
            </p>
          ) : (
            messages.map((message) => (
              <article
                className="rounded-md border p-3 text-sm"
                key={message.id}
              >
                <p className="text-muted-foreground text-xs font-medium">
                  {message.role === "user"
                    ? zhCN.copilot.user
                    : zhCN.copilot.assistant}
                </p>
                <p className="mt-1 leading-6">{message.content}</p>
              </article>
            ))
          )}
        </div>

        {state.status === "success" ? (
          state.sources?.length ? <section aria-label="知识库来源" className="space-y-2 text-sm"><p className="font-medium">知识库来源</p>{state.sources.map((source) => <article className="rounded-md border p-3" key={`${source.meetingId}:${source.content}`}><p>{source.title}</p><p className="text-muted-foreground text-xs">{new Date(source.meetingDate).toLocaleDateString("zh-CN")}</p><p className="mt-1">{source.content}</p></article>)}</section> : <p className="text-muted-foreground text-sm" role="status">知识库当前不可用，已基于本次会议上下文回答。</p>
        ) : null}

        {!archived ? (
          <form action={action} className="space-y-3">
            <input name="meetingId" type="hidden" value={meetingId} />
            <div className="space-y-2">
              <Label htmlFor="meeting-copilot-prompt">
                {zhCN.copilot.promptLabel}
              </Label>
              <textarea
                className="border-input bg-background min-h-24 w-full rounded-md border p-3 text-sm"
                defaultValue={state.value}
                id="meeting-copilot-prompt"
                name="prompt"
                required
              />
            </div>
            {state.status === "error" ? (
              <p className="text-destructive text-sm" role="alert">
                {state.message}
              </p>
            ) : null}
            {state.status === "success" ? (
              <p className="text-muted-foreground text-sm" role="status">
                {state.message}
              </p>
            ) : null}
            <Button disabled={pending} type="submit">
              {pending ? zhCN.copilot.sending : zhCN.copilot.send}
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            {zhCN.copilot.archivedReadOnly}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
