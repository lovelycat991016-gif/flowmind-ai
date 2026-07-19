# Sprint 7 Meeting Intelligence Design

## Status

Proposed. No implementation begins until this specification and plan are approved.

## Objective

Turn one completed, owner-visible transcript into a concise meeting summary, structured action items, and explicit decisions. The feature is an asynchronous derivative of Sprint 6 transcription; it does not change recording or transcription behavior.

## Scope

Included: one bounded LLM analysis run per transcript revision, summary generation, action-item extraction, decision extraction, prompt/version audit data, owner-scoped read UI, and cost-aware retry/observability.

Excluded: AI chat, knowledge search, embeddings, agents, new team roles, transcript editing, audio processing, and user-authored prompt editing.

## Architecture

The existing Cron worker claims a new `meeting_intelligence` processing job only after its recording-processing job reaches `completed` and a transcript exists. It reads transcript text from PostgreSQL using the service-role client, invokes a provider-neutral `MeetingIntelligenceProvider`, validates a strict JSON result, and completes all derived data through one lease-protected RPC.

```text
completed transcript -> queued intelligence job -> existing protected worker
-> prompt registry/version -> LLM JSON response -> validation
-> summary + action_items + decisions + completed job
```

The worker processes at most one job per invocation. It retains the persisted lifecycle `queued -> running -> completed | failed | cancelled`; no new status is required.

## Data Model Proposal

Migration proposal: `202607210001_add_meeting_intelligence.sql`.

| Object               | Key fields and constraints                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processing_jobs`    | Permit `job_type = 'meeting_intelligence'`; retain one active job per `(recording_id, job_type)` and existing owner/lease semantics.                                                                                      |
| `meeting_summaries`  | `id`, unique `transcript_id`, `meeting_id`, `user_id`, `content`, `prompt_version`, `model`, `created_at`, `updated_at`; nonblank bounded content; owner-only SELECT.                                                     |
| `action_items`       | `id`, `summary_id`, `meeting_id`, `user_id`, `content`, nullable `assignee_name`, nullable `due_date`, `source_segment_index`, `created_at`; normalized nonblank content; owner-only SELECT.                              |
| `meeting_decisions`  | `id`, `summary_id`, `meeting_id`, `user_id`, `content`, nullable `source_segment_index`, `created_at`; nonblank content; owner-only SELECT.                                                                               |
| `ai_prompt_versions` | immutable internal registry: `feature`, `version`, `template`, `schema_version`, `active`, timestamps. No authenticated-user write policy.                                                                                |
| `ai_processing_runs` | internal audit: job/transcript IDs, prompt version, model, input/output token counts when provided, status-safe error code, timing, created/completed timestamps. Owner-only SELECT is optional for V1; no client writes. |

The completion RPC verifies the job lease and owner relationship through recording, meeting, and transcript; inserts one run, summary, items, and decisions, then completes the job atomically. Failed RPC writes only a whitelisted safe code.

## Prompt And Provider Boundary

`MeetingIntelligenceProvider` accepts normalized transcript text plus a fixed prompt version and returns `{ summary, actionItems, decisions }`. The provider adapter is the only model-specific module. Prompts demand JSON only, prohibit invented facts, preserve uncertainty, and require source segment indexes when evidence exists. Zod validates response size, array limits, dates, and references before persistence.

Prompts are code-owned and seeded by migration; a completed result stores the prompt version, schema version, and model identifier. Changes create a new immutable version, never overwrite historical content.

## Security, Failure, And Cost

- RLS exposes derived results only to their owner. Browser routes use the authenticated server client; only the worker receives provider credentials and service-role access.
- Never send audio, user profile data, storage URLs, secrets, or raw provider errors to the model or UI.
- Permanent invalid-output/rejected-input failures become `failed`; transient rate-limit, timeout, and availability failures use existing safe retry semantics and bounded attempts.
- Cap transcript characters/tokens before invocation; reject oversized input rather than silently truncating. One combined call avoids three repeated transcript inputs. Persist token usage/cost metadata when available, set a per-run output cap, and expose no automatic regeneration UI in Sprint 7.

## User Experience

Meeting detail adds a read-only “会议智能” section after transcript content. Pending/running shows semantic status text; completed shows a concise summary, action-item list, and decision list; absent/failed/cancelled shows safe empty state. Archived meetings display existing intelligence read-only. Existing route loading/error boundaries cover read failures.

## Acceptance Criteria

- Exactly one active intelligence job is created idempotently for a completed transcript.
- A valid provider result atomically persists one summary plus ordered action items and decisions for the owner.
- Invalid, cross-user, expired-lease, and provider failures cannot leak raw details or write partial results.
- Prompt/model/version metadata is retained with each run/result.
- UI is responsive, accessible, and read-only for archived meetings.
- No chat, summary editing, transcript changes, or non-Sprint-7 AI feature is added.
