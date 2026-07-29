import { meetingIntelligenceResultSchema } from "@/features/meeting-intelligence/schemas/meeting-intelligence-input";
import { createClient } from "@/shared/lib/supabase/server";
import { retrieveMeetingContext } from "@/features/meeting-knowledge/queries/retrieve-meeting-context";

const MAX_TRANSCRIPT_CONTEXT_LENGTH = 12_000;

type CopilotActionItem = {
  title: string;
  owner: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
};

export type MeetingCopilotContextData = {
  transcript: string | null;
  summary: string | null;
  decisions: string[];
  actionItems: CopilotActionItem[];
  risks: string[];
};
export type MeetingCopilotSource = {
  meetingId: string;
  title: string;
  meetingDate: string;
  content: string;
  metadata: Record<string, unknown>;
};

export async function retrieveMeetingCopilotSources(input: {
  question: string;
  userId: string;
}): Promise<MeetingCopilotSource[]> {
  try {
    const chunks = await retrieveMeetingContext({ question: input.question });
    if (!chunks.length) return [];
    const supabase = await createClient();
    const ids = [...new Set(chunks.map((chunk) => chunk.meetingId))];
    const { data, error } = await supabase
      .from("meetings")
      .select("id,title,meeting_date")
      .eq("user_id", input.userId)
      .in("id", ids);
    if (error) return [];
    const meetings = new Map(
      ((data ?? []) as Array<{ id: string; title: string; meeting_date: string }>).map(
        (meeting) => [meeting.id, meeting],
      ),
    );
    return chunks.flatMap((chunk) => {
      const meeting = meetings.get(chunk.meetingId);
      return meeting
        ? [{ meetingId: meeting.id, title: meeting.title, meetingDate: meeting.meeting_date, content: chunk.content, metadata: chunk.metadata }]
        : [];
    });
  } catch {
    return [];
  }
}

const statusLabels: Record<CopilotActionItem["status"], string> = {
  open: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

function list(label: string, values: string[]) {
  return values.length
    ? `${label}\n${values.map((value) => `- ${value}`).join("\n")}`
    : null;
}

export function formatMeetingCopilotContext(data: MeetingCopilotContextData) {
  const sections = [
    data.transcript
      ? `会议转录\n${data.transcript.slice(0, MAX_TRANSCRIPT_CONTEXT_LENGTH)}`
      : null,
    data.summary ? `会议摘要\n${data.summary}` : null,
    list("关键决策", data.decisions),
    data.actionItems.length
      ? `行动项\n${data.actionItems
          .map(
            (item) =>
              `- ${item.title}（${item.owner ?? "未指定负责人"}，${statusLabels[item.status]}）`,
          )
          .join("\n")}`
      : null,
    list("风险", data.risks),
  ].filter((section): section is string => Boolean(section));

  return sections.join("\n\n") || "暂无可用会议上下文。";
}

export async function buildMeetingCopilotContext(input: {
  meetingId: string;
  userId: string;
  question?: string;
}) {
  const supabase = await createClient();
  const [recordingResult, intelligenceResult, actionItemResult] =
    await Promise.all([
      supabase
        .from("recordings")
        .select("id")
        .eq("meeting_id", input.meetingId)
        .eq("user_id", input.userId)
        .eq("status", "uploaded")
        .maybeSingle(),
      supabase
        .from("meeting_intelligence")
        .select("result")
        .eq("meeting_id", input.meetingId)
        .eq("user_id", input.userId)
        .eq("status", "completed")
        .maybeSingle(),
      supabase
        .from("action_items")
        .select("title,owner,status")
        .eq("meeting_id", input.meetingId)
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false }),
    ]);
  if (
    recordingResult.error ||
    intelligenceResult.error ||
    actionItemResult.error
  ) {
    throw new Error("Unable to build meeting Copilot context.");
  }

  const recording = recordingResult.data as { id: string } | null;
  let transcript: string | null = null;
  if (recording) {
    const transcriptResult = await supabase
      .from("transcripts")
      .select("content")
      .eq("recording_id", recording.id)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (transcriptResult.error)
      throw new Error("Unable to build meeting Copilot context.");
    transcript =
      (transcriptResult.data as { content: string } | null)?.content ?? null;
  }

  const intelligence = meetingIntelligenceResultSchema.safeParse(
    (intelligenceResult.data as { result: unknown } | null)?.result,
  );
  const currentContext = formatMeetingCopilotContext({
    transcript,
    summary: intelligence.success ? intelligence.data.summary.content : null,
    decisions: intelligence.success
      ? intelligence.data.decisions.map((decision) => decision.content)
      : [],
    actionItems: (actionItemResult.data ?? []) as CopilotActionItem[],
    risks: intelligence.success ? intelligence.data.risks : [],
  });
  if (!input.question) return currentContext;
  let chunks: Awaited<ReturnType<typeof retrieveMeetingContext>> = [];
  try {
    chunks = await retrieveMeetingContext({ question: input.question });
  } catch {
    return currentContext;
  }
  return chunks.length
    ? `${currentContext}\n\n历史会议来源\n${chunks.map((chunk) => `- [${chunk.meetingId}] ${chunk.content}`).join("\n")}`
    : currentContext;
}
