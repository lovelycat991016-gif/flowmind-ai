# FlowMind AI: Turning Meetings into Reusable Knowledge

## 1. Problem

Meeting notes are not the central problem. Teams can already save recordings
and transcripts, but critical context remains difficult to reuse: decisions
lose their rationale, action items are missed, and risks get discussed again
because historical conversations are not accessible when work resumes.

## 2. Insight

The value of a meeting is not the recording itself. It is the ability to turn
discussion into structured, trustworthy knowledge that supports the next
decision. FlowMind AI therefore treats a meeting as a source for summary,
decisions, risks, action items, and retrievable evidence rather than as a file
to archive.

## 3. Product Decision

V1 focuses on **Post-meeting Intelligence**. This creates a clear and
testable loop: upload a recording, process it asynchronously, review
structured outcomes, then retrieve relevant history during later work.

This choice avoids the operational and UX complexity of real-time audio,
while validating whether users actually value AI-assisted follow-through and
knowledge reuse.

## 4. MVP Scope

V1 includes authentication, meetings, audio upload, transcription, AI summary,
decisions, risks, action items, knowledge chunks, retrieval, and Copilot source
citations.

It deliberately excludes a Live Bot, team workspace, billing, and workflow
automation. These capabilities would expand permissions, latency requirements,
and operational scope before the core post-meeting value proposition is proven.

## 5. AI Architecture

```text
Audio
  ↓
Transcription
  ↓
LLM Understanding
  ↓
Structured Output
  ↓
RAG
  ↓
Copilot
```

Speech recognition produces a transcript and segments. The LLM creates
validated structured meeting intelligence. The knowledge pipeline chunks and
embeds meeting content. Retrieval provides relevant historical context to the
Copilot, and each current response can show its real source meeting and excerpt.

## 6. Reliability Design

AI calls are handled asynchronously because external providers can be slow or
fail. The worker design uses a persisted job lifecycle, lease-based ownership,
retry and recovery, invocation fencing, provider timeouts, and an execution
budget. These controls prevent a stale worker from overwriting a newer attempt
and ensure failures are recorded with safe error codes rather than raw provider
details.

## 7. Product Metrics

### User Metrics

- Meeting analysis completion rate
- AI result viewing rate
- Action-item engagement rate
- Historical knowledge reuse rate

### AI Metrics

- Transcription success rate
- Structured AI generation success rate
- Copilot response latency
- Retrieval hit rate and source accuracy
- Citation correctness and empty-retrieval rate

### Reliability Metrics

- Provider timeout and failure distribution
- Retry recovery rate
- Lease recovery rate
- Worker execution latency and queue backlog

## 8. Future Roadmap

1. Improve individual meeting follow-through with real embedding quality
   evidence and faster worker throughput.
2. Add team knowledge collaboration, shared workspaces, and project-level
   action tracking.
3. Evolve toward an organization assistant with live meeting support and a
   connected decision/risk knowledge graph.
