import type { ActionItem } from "@/entities/action-item/model/action-item";
import {
  completeActionItemAction,
  createActionItemFromIntelligenceAction,
  updateActionItemStatusAction,
} from "@/features/action-items/actions/action-item-actions";
import { zhCN } from "@/shared/i18n/zh-CN";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type IntelligenceActionItem = {
  content: string;
  assigneeName?: string | null;
  dueDate?: string | null;
};

type Intelligence = {
  id?: string;
  result: { actionItems: IntelligenceActionItem[] } | null;
} | null;

const statusVariant = {
  open: "warning",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
} as const;

export function MeetingActionItemsSection({
  archived,
  intelligence,
  meetingId,
  tasks,
}: {
  archived: boolean;
  intelligence: Intelligence;
  meetingId: string;
  tasks: Pick<ActionItem, "id" | "title" | "status" | "owner" | "dueDate">[];
}) {
  const intelligenceItems = intelligence?.result?.actionItems ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.actionItems.title}</CardTitle>
        {archived ? (
          <p className="text-muted-foreground text-sm" role="status">
            {zhCN.actionItems.archivedReadOnly}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm" role="status">
            {zhCN.actionItems.empty}
          </p>
        ) : (
          <ul aria-label={zhCN.actionItems.title} className="space-y-3">
            {tasks.map((task) => {
              const terminal =
                task.status === "completed" || task.status === "cancelled";
              return (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  key={task.id}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{task.title}</p>
                    {task.owner ? (
                      <p className="text-muted-foreground text-sm">
                        {task.owner}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[task.status]}>
                      {zhCN.actionItems.status[task.status]}
                    </Badge>
                    {!archived && !terminal ? (
                      <>
                        <form
                          action={async (formData) => {
                            await updateActionItemStatusAction(formData);
                          }}
                        >
                          <input
                            name="meetingId"
                            type="hidden"
                            value={meetingId}
                          />
                          <input
                            name="actionItemId"
                            type="hidden"
                            value={task.id}
                          />
                          <select
                            aria-label={zhCN.actionItems.changeStatus}
                            defaultValue=""
                            name="status"
                          >
                            <option disabled value="">
                              {zhCN.actionItems.changeStatusPrompt}
                            </option>
                            <option value="in_progress">
                              {zhCN.actionItems.status.in_progress}
                            </option>
                            <option value="completed">
                              {zhCN.actionItems.status.completed}
                            </option>
                            <option value="cancelled">
                              {zhCN.actionItems.status.cancelled}
                            </option>
                          </select>
                          <Button size="sm" type="submit" variant="outline">
                            {zhCN.actionItems.updateStatus}
                          </Button>
                        </form>
                        <form
                          action={async (formData) => {
                            await completeActionItemAction(formData);
                          }}
                        >
                          <input
                            name="meetingId"
                            type="hidden"
                            value={meetingId}
                          />
                          <input
                            name="actionItemId"
                            type="hidden"
                            value={task.id}
                          />
                          <Button size="sm" type="submit" variant="outline">
                            {zhCN.actionItems.complete}
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {intelligenceItems.length > 0 ? (
          <section aria-labelledby="intelligence-action-items-heading">
            <h3
              className="text-sm font-medium"
              id="intelligence-action-items-heading"
            >
              {zhCN.actionItems.fromIntelligence}
            </h3>
            <ul className="mt-2 space-y-2">
              {intelligenceItems.map((item, index) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  key={`${item.content}-${index}`}
                >
                  <span>{item.content}</span>
                  {!archived && intelligence?.id ? (
                    <form
                      action={async (formData) => {
                        await createActionItemFromIntelligenceAction(formData);
                      }}
                    >
                      <input name="meetingId" type="hidden" value={meetingId} />
                      <input
                        name="intelligenceId"
                        type="hidden"
                        value={intelligence.id}
                      />
                      <input
                        name="actionItemIndex"
                        type="hidden"
                        value={index}
                      />
                      <Button size="sm" type="submit" variant="outline">
                        {zhCN.actionItems.create}
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
