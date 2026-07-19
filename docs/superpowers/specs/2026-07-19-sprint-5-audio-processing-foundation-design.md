# Sprint 5 Audio Processing Foundation Design

## Status

Proposed. No implementation is authorized until this specification and plan are approved.

## Objective

Introduce a durable, owner-isolated processing-job foundation for uploaded recordings. Sprint 5 records the intent to process an uploaded recording asynchronously; it does not process audio or produce any derived content.

## Scope

Included:

- `public.processing_jobs` table and lifecycle contract
- One queued `recording_processing` job after a recording reaches `uploaded`
- Owner-scoped job reads and safe queueing mutation
- Job status presentation on the meeting recording section
- Async worker boundary documentation only

Excluded:

- Whisper, transcription, speech-to-text, external AI APIs, summaries, action items, embeddings, agents, and background worker execution
- Audio playback, downloads, recording replacement, team processing queues, retries executed by a worker, notifications, and billing
- New API routes and service-role credentials in the web application

## Design Choice

Use a PostgreSQL-backed durable queue. A completed recording enqueues a job in the same authenticated application workflow. The database is the source of truth for job state; the web UI never infers processing from a client timer.

No job consumer is started in Sprint 5. Jobs remain queued until a later, separately approved sprint provides a worker identity, lease/claim protocol, execution runtime, and actual audio-processing capability.

## Database Contract

Create the enum `public.processing_job_status`:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Create `public.processing_jobs`:

| Column                                                    | Definition                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `id`                                                      | UUID primary key                                                           |
| `recording_id`                                            | Required FK to `public.recordings(id)` with `on delete cascade`            |
| `user_id`                                                 | Required FK to `auth.users(id)` with `on delete cascade`                   |
| `job_type`                                                | Required fixed value `recording_processing`                                |
| `status`                                                  | Required lifecycle value, default `queued`                                 |
| `attempt_count`                                           | Required non-negative integer, default `0`                                 |
| `max_attempts`                                            | Required positive integer, default `3`                                     |
| `locked_at`, `locked_by`                                  | Nullable future worker lease fields; unused in Sprint 5                    |
| `started_at`, `completed_at`, `failed_at`, `cancelled_at` | Nullable lifecycle timestamps; unused except future compatibility          |
| `last_error_code`                                         | Nullable safe application error code; no provider message or audio content |
| `created_at`, `updated_at`                                | UTC timestamps; existing `set_updated_at` trigger maintains `updated_at`   |

Constraints and indexes:

- `job_type = 'recording_processing'`
- `attempt_count >= 0`, `max_attempts between 1 and 10`, and `attempt_count <= max_attempts`
- Partial unique index on `recording_id` for `queued` and `running`, preventing duplicate active work
- Owner/status/created-at index for owner-scoped display and future worker queue scans
- Unique job IDs only; failed, completed, and cancelled history is retained

## Lifecycle

Permitted state transitions:

| From      | To                                           |
| --------- | -------------------------------------------- |
| `queued`  | `running`, `cancelled`                       |
| `running` | `completed`, `failed`, `cancelled`, `queued` |

`running -> queued` is a future lease-recovery transition. No code in Sprint 5 may claim, run, retry, or complete a job. The user-facing enqueue workflow creates only `queued` jobs.

## Recording-To-Processing Workflow

1. A recording becomes `uploaded` only after the existing Storage object verification succeeds.
2. The authenticated Server Action queues one `recording_processing` job for that owner-visible recording.
3. The insert verifies that the recording is owned by the current user and has `uploaded` status.
4. The active-job partial unique index prevents duplicate queue entries under concurrent requests.
5. Meeting detail revalidates and displays the queued state.
6. A later worker may claim a queued job, but Sprint 5 does not supply that worker or any audio processing implementation.

Queueing is idempotent: attempting to queue an already-active recording returns its existing active job rather than creating a duplicate or leaking a database error.

## Security And RLS

`processing_jobs` uses RLS:

- Select only records where `auth.uid() = user_id`
- Insert only when `auth.uid() = user_id` and the referenced recording is owner-visible and `uploaded`
- No owner update or delete workflow in Sprint 5
- Anonymous access is revoked

The authenticated web application never accesses a service-role key. A future worker authorization model is intentionally deferred; it must be specified before worker execution is introduced.

## UI

The meeting recording section displays a compact processing badge only when an owner-visible job exists:

- `queued`: “等待处理”
- `running`: “处理中”
- `completed`: “处理完成”
- `failed`: “处理失败”
- `cancelled`: “处理已取消”

The upload form and existing recording controls do not gain transcript, summary, retry-processing, or cancellation commands. The initial user-facing workflow may show only `queued`, since no worker is launched in this sprint.

## Async Architecture Boundary

Sprint 5 defines the durable handoff boundary, not an executor. The future worker must:

- Authenticate with a separately approved non-user identity
- Atomically claim a queued job with a lease
- Increment attempts and write only safe status/error-code updates
- Handle expired leases and idempotent external execution
- Consume the recording object only after owner and job ownership checks

Those requirements are explicitly deferred, alongside any transcription or AI integration.

## Testing And Acceptance

Automated tests cover migration constraints/RLS, status transitions, recording ownership and uploaded-state preconditions, idempotent active-job queueing, query hiding for RLS-inaccessible jobs, and job badge rendering. Browser QA covers meeting detail badges on desktop, tablet, and mobile.

Sprint 5 is accepted when an uploaded owner-visible recording creates one durable queued job, duplicate queue attempts do not create duplicate active jobs, job metadata remains owner-only, and no audio or AI processing code exists.
