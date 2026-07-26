import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { zhCN } from "@/shared/i18n/zh-CN";

type Intelligence = {
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  result: {
    summary: { content: string };
    keyPoints: string[];
    actionItems: { content: string }[];
    decisions: { content: string }[];
    risks: string[];
  } | null;
};

const statusLabels = {
  queued: zhCN.intelligence.statusQueued,
  running: zhCN.intelligence.statusRunning,
  completed: zhCN.intelligence.statusCompleted,
  failed: zhCN.intelligence.statusFailed,
  cancelled: zhCN.intelligence.statusCancelled,
} as const;

function IntelligenceList({
  label,
  items,
}: {
  label: string;
  items: { content: string }[] | string[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-medium">{label}</h3>
      <ul aria-label={label} className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={index}>{typeof item === "string" ? item : item.content}</li>
        ))}
      </ul>
    </section>
  );
}

export function MeetingIntelligenceSection({
  intelligence,
  archived = false,
}: {
  intelligence: Intelligence | null;
  archived?: boolean;
}) {
  const completed = intelligence?.status === "completed" && intelligence.result;
  const result = completed || null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.intelligence.title}</CardTitle>
        {intelligence ? (
          <p className="text-muted-foreground text-sm" role="status">
            {statusLabels[intelligence.status]}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {result ? (
          <>
            <section>
              <h3 className="text-sm font-medium">
                {zhCN.intelligence.summary}
              </h3>
              <p className="mt-2 text-sm leading-7">{result.summary.content}</p>
            </section>
            <IntelligenceList
              items={result.keyPoints}
              label={zhCN.intelligence.keyPoints}
            />
            <IntelligenceList
              items={result.actionItems}
              label={zhCN.intelligence.actionItems}
            />
            <IntelligenceList
              items={result.decisions}
              label={zhCN.intelligence.decisions}
            />
            <IntelligenceList
              items={result.risks}
              label={zhCN.intelligence.risks}
            />
            {archived ? (
              <p className="text-muted-foreground text-sm">
                {zhCN.intelligence.archivedReadOnly}
              </p>
            ) : null}
          </>
        ) : (
          <div
            className="text-muted-foreground text-sm"
            role={intelligence ? undefined : "status"}
          >
            {intelligence
              ? statusLabels[intelligence.status]
              : zhCN.intelligence.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
