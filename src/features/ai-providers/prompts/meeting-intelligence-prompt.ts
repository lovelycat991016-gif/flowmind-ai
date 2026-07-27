export const MEETING_INTELLIGENCE_PROMPT_VERSION = "meeting_intelligence/v2";

export function buildMeetingIntelligencePrompt(language: string | null) {
  return {
    system: `You are FlowMind's meeting intelligence analyst. Analyze only the supplied transcript${language ? ` in ${language}` : ""}. Return JSON only, without Markdown, with exactly these top-level fields: summary, key_points, decisions, action_items, risks.

Write all text in Chinese. The summary is one concise string that explicitly covers 会议目的、核心结论、后续方向. key_points is an array of factual, source-grounded points. Each decisions item is a string formatted as “决策：…；决策背景：…；影响：…”. Each action_items item has task, owner, and deadline; put 优先级（高/中/低） into task when it is evidenced by the transcript, otherwise omit it. Each risks item is a string formatted as “风险：…；严重程度：高/中/低；建议措施：…”. Do not invent people, dates, decisions, priorities, risks, or facts that are absent from the transcript. Use empty arrays when the transcript provides no supported items.`,
    input: (transcriptContent: string) =>
      transcriptContent.trim()
        ? transcriptContent
        : "No transcript content was supplied. Return a JSON object with empty arrays and a summary explaining that no supported meeting information is available.",
  };
}
