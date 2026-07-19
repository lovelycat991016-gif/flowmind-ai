import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { zhCN } from "@/shared/i18n/zh-CN";

type Intelligence = {
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  result: {
    summary: { content: string };
    actionItems: { content: string }[];
    decisions: { content: string }[];
  } | null;
};
export function MeetingIntelligenceSection({
  intelligence,
  archived = false,
}: {
  intelligence: Intelligence | null;
  archived?: boolean;
}) {
  const pending =
    intelligence?.status === "queued" || intelligence?.status === "running";
  const completed = intelligence?.status === "completed" && intelligence.result;
  const result = completed || null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{zhCN.intelligence.title}</CardTitle>
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
            <section>
              <h3 className="text-sm font-medium">
                {zhCN.intelligence.actionItems}
              </h3>
              <ul
                aria-label={zhCN.intelligence.actionItems}
                className="mt-2 list-disc space-y-1 pl-5 text-sm"
              >
                {result.actionItems.map((item, index) => (
                  <li key={index}>{item.content}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-sm font-medium">
                {zhCN.intelligence.decisions}
              </h3>
              <ul
                aria-label={zhCN.intelligence.decisions}
                className="mt-2 list-disc space-y-1 pl-5 text-sm"
              >
                {result.decisions.map((item, index) => (
                  <li key={index}>{item.content}</li>
                ))}
              </ul>
            </section>
            {archived ? (
              <p className="text-muted-foreground text-sm">
                {zhCN.intelligence.archivedReadOnly}
              </p>
            ) : null}
          </>
        ) : (
          <div role="status" className="text-muted-foreground text-sm">
            {pending
              ? zhCN.intelligence.processing
              : intelligence?.status === "failed" ||
                  intelligence?.status === "cancelled"
                ? zhCN.intelligence.unavailable
                : zhCN.intelligence.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
