# Sprint 6 Transcription Worker Design

## Status

Proposed. Implementation requires explicit approval of this specification and its implementation plan.

## Objective

Deliver FlowMind AI's first audio-processing capability: an asynchronous, owner-isolated worker that claims uploaded-recording jobs, transcribes bounded audio through the OpenAI Whisper boundary, and persists durable transcript data. The Next.js web application remains a request/UI layer; it does not process audio during a user request.

## Scope

Included:

- A protected, bounded Vercel Cron worker runner for `recording_processing` jobs
- Durable worker claim, lease, completion, failure, and retry behavior
- `transcripts` and `transcript_segments` persistence with owner isolation
- A server-only OpenAI Whisper provider adapter
- Private Supabase Storage download from the worker
- Existing meeting-detail processing-status display updated through durable job state
- Migration, domain, worker, route, and integration tests

Excluded:

- Summaries, action items, chat, search, embeddings, agents, and team workspaces
- Audio playback, manual transcript editing, transcript export, or a transcript-reading UI
- Browser-side OpenAI calls, user-facing processing controls, and public worker APIs
- Media segmentation, codec conversion, speaker diarization, and concurrent multi-file processing

The first transcript is persisted but not rendered as a full reader in Sprint 6. A completed status is visible in the existing meeting detail experience; transcript presentation is a separately scoped follow-up.

## Architecture

Use Vercel Cron to invoke a private internal Route Handler at a bounded interval. The handler authenticates a cron secret, constructs a server-only worker context, and claims at most one eligible job through an atomic PostgreSQL RPC. This retains Vercel as the deployment surface while avoiding long-running processing in a user-triggered Server Action.

The worker is the only application process that receives `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY`. Those values are Vercel server environment variables and are never imported by browser bundles, Server Components, Server Actions, or user-facing routes. The existing authenticated Supabase client and RLS remain the boundary for all web reads and mutations.

```text
recording uploaded
  -> processing_jobs queued
  -> Vercel Cron / internal worker route
  -> atomic PostgreSQL claim with lease
  -> private Storage download
  -> Whisper provider adapter
  -> atomic transcript write + job completion
  -> existing owner-scoped meeting detail status
```

## Processing Job Lifecycle Extension

The persisted enum remains unchanged:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Sprint 6 activates these transitions:

| From      | To          | Actor                       | Meaning                                                          |
| --------- | ----------- | --------------------------- | ---------------------------------------------------------------- |
| `queued`  | `running`   | worker claim RPC            | A worker holds an unexpired lease.                               |
| `queued`  | `cancelled` | future authorized operation | No execution begins. No UI control is added in Sprint 6.         |
| `running` | `completed` | worker completion RPC       | Transcript and segments commit atomically.                       |
| `running` | `queued`    | lease recovery or retry RPC | A retry is scheduled after a transient failure or expired lease. |
| `running` | `failed`    | worker failure RPC          | A permanent failure or exhausted retry budget.                   |

`attempt_count` increments atomically at claim time. The existing `max_attempts` default of three remains authoritative. The worker must never update a job unless `id`, `status = 'running'`, and `locked_by` match its active lease.

## Database Migration Proposal

The approved implementation migration is proposed as `supabase/migrations/202607200001_add_transcription_processing.sql`. It is not created in this planning task.

### `processing_jobs` extension

Add:

- `lease_expires_at timestamptz` for deterministic stale-lease recovery
- `next_attempt_at timestamptz not null default timezone('utc', now())` for scheduled retry eligibility
- Partial claim index on queued, due jobs: `(next_attempt_at, created_at)` where `status = 'queued'`

Preserve the existing enum, owner fields, active-job uniqueness, attempt limits, and trigger. Add atomic, server-only database functions:

- `claim_next_transcription_job(worker_id text, lease_seconds integer)` uses `FOR UPDATE SKIP LOCKED`, claims one due job, increments attempts, sets `running`, `locked_at`, `lease_expires_at`, and `started_at`.
- `complete_transcription_job(...)` verifies the worker lease, inserts one transcript plus ordered segments, and marks the job `completed` in one transaction.
- `fail_transcription_job(...)` verifies the lease, records a safe error code, and either schedules the next attempt or marks the job `failed`.
- `recover_expired_transcription_leases(...)` requeues only expired running jobs with remaining attempts; exhausted jobs become `failed` with a safe code.

These functions are executable only by the worker identity. They are not granted to `anon` or `authenticated`.

### `transcripts`

Create one transcript per recording:

| Column                     | Definition                                                       |
| -------------------------- | ---------------------------------------------------------------- |
| `id`                       | UUID primary key                                                 |
| `recording_id`             | Required FK to `recordings(id)` with `on delete cascade`, unique |
| `user_id`                  | Required FK to `auth.users(id)` with `on delete cascade`         |
| `provider`                 | Required fixed value `openai`                                    |
| `provider_model`           | Required provider model identifier, initially `whisper-1`        |
| `language`                 | Nullable detected or supplied language code                      |
| `content`                  | Required normalized transcript text                              |
| `completed_at`             | Required UTC completion timestamp                                |
| `created_at`, `updated_at` | UTC timestamps, maintained by `set_updated_at()`                 |

Constraints require a nonblank bounded `content`, expected provider value, and trimmed nonblank model identifier. Add an owner/recording index and RLS owner-only select. No browser or authenticated-user insert/update/delete policy is added; the worker writes through the protected completion function.

### `transcript_segments`

Create ordered timing metadata for the transcript:

| Column               | Definition                                                |
| -------------------- | --------------------------------------------------------- |
| `id`                 | UUID primary key                                          |
| `transcript_id`      | Required FK to `transcripts(id)` with `on delete cascade` |
| `segment_index`      | Required zero-based sequence number                       |
| `start_ms`, `end_ms` | Required nonnegative bounds with `end_ms >= start_ms`     |
| `content`            | Required nonblank segment text                            |
| `created_at`         | UTC timestamp                                             |

Enforce `unique (transcript_id, segment_index)`. Segment RLS allows owner-only reads through its parent transcript. The worker completion function owns all writes.

## Whisper Integration Boundary

Define a narrow `TranscriptionProvider` interface independent of the OpenAI SDK. The worker supplies an in-memory bounded audio payload, filename, MIME type, and an optional language; the adapter returns normalized text, detected language, provider model, and timestamped segments. `OpenAIWhisperTranscriptionProvider` is the only implementation in Sprint 6 and owns SDK-specific request/response mapping.

The worker validates `recordings.mime_type` against the existing allowlist and validates `file_size_bytes` against a server-side `TRANSCRIPTION_MAX_INPUT_BYTES` value before downloading Storage bytes. That value must be set to the provider's currently documented request limit during implementation and be covered by tests. The existing 500 MB upload limit does not imply every recording is transcribable in Sprint 6.

Files above the configured transcription limit fail with `transcription_input_too_large`; Sprint 6 intentionally does not add FFmpeg, chunking, or media conversion. This keeps the first worker bounded and makes the product limitation explicit rather than silently truncating audio.

## Storage Access Pattern

The worker verifies the claimed job, recording, and owner relationship before accessing Storage. It downloads the exact private object from the persisted `storage_bucket` and `storage_path` with the server-only service-role client. It does not generate a browser-visible signed read URL and never gives the OpenAI provider a Storage URL.

The object is held only for the bounded provider request and discarded from memory afterward. The worker never writes provider payloads, raw response objects, Storage URLs, API keys, or unredacted provider errors to PostgreSQL or logs.

## Failure And Retry Strategy

Classify failures using safe application error codes only:

- Permanent: `storage_object_missing`, `unsupported_audio_type`, `transcription_input_too_large`, `invalid_audio`, `provider_rejected_audio`.
- Transient: `storage_unavailable`, `provider_rate_limited`, `provider_unavailable`, `provider_timeout`, `provider_request_failed`.
- Operational: `lease_expired`, `worker_unexpected_error`.

Permanent failures transition directly to `failed`. Transient failures requeue while attempts remain, using a fixed documented backoff of 1 minute, 5 minutes, then 30 minutes. When a claim has consumed the maximum attempt count, the job transitions to `failed`; raw provider messages are never persisted.

The active-job partial unique index prevents concurrent work for one recording. The lease prevents two workers from completing the same active job. A crash after an external provider success but before database completion can still incur a duplicate provider call on retry; unique transcript persistence prevents duplicate stored transcripts, but external-call idempotency remains a documented residual cost risk.

## Ownership And Security

- Browser users can only read their own transcript and segment rows through RLS.
- User-facing Server Actions do not claim, run, complete, retry, or directly update processing jobs.
- The internal cron route verifies `Authorization: Bearer CRON_SECRET` before creating the worker context, returns a generic response, and is excluded from public navigation.
- The worker validates `processing_jobs.user_id = recordings.user_id` and reads meeting ownership through `recordings.meeting_id` before provider invocation.
- `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRON_SECRET` are server-only runtime secrets. They must not have `NEXT_PUBLIC_` prefixes.
- Worker logs contain job/recording identifiers and safe error codes only. They contain no transcript text, audio bytes, or secrets.

## User Experience

Sprint 6 preserves the existing meeting detail recording section. Its compact status badge changes from `等待AI处理` to `正在处理中`, `处理完成`, `处理失败`, or `已取消` according to durable job state. No polling loop is introduced; refresh or normal route revalidation reads the current owner-scoped state. Existing loading and error boundaries remain responsible for query failures.

## Acceptance Criteria

Sprint 6 is accepted when:

- An uploaded, owner-visible recording creates one durable queued job and an authenticated cron worker can claim it once.
- A valid bounded audio object produces exactly one owner-visible transcript and ordered segments, then completes its job.
- A second user cannot read the job, transcript, or segments.
- Transient failures back off and retry without exposing provider details; permanent failures remain safe and terminal.
- Expired worker leases recover without duplicate active processing.
- No browser bundle, Server Action, or public endpoint contains a service-role key or OpenAI API key.
- No summary, action item, agent, search, or AI chat capability is added.
