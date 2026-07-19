# Sprint 6 Transcription Pipeline QA

## Scope

Sprint 6 delivers the first bounded transcription pipeline only. It creates owner-isolated transcript data, claims one queued processing job at a time, reads private recording audio server-side, calls the isolated Whisper provider adapter, and displays the owner-visible transcript in meeting detail.

The Sprint does not add summaries, action items, AI chat, knowledge search, FFmpeg, audio chunking, or user-facing worker controls.

## Migration Verification

Apply these migrations in order before enabling the worker in an environment:

1. `202607200001_add_transcription_processing.sql` creates `transcripts` and `transcript_segments` with ordering and content constraints.
2. `202607200002_add_processing_job_leases.sql` adds the claim lease and service-role-only claim RPC.
3. `202607200003_add_transcription_execution.sql` adds service-role-only complete and fail RPCs.

The completion RPC locks a running, unexpired worker lease; verifies the `processing_jobs -> recordings -> meetings` ownership chain; writes one transcript and ordered segments; then marks the job `completed` in the same PostgreSQL transaction. The failure RPC accepts only known safe error codes and transitions a matching running lease to `failed`.

## Ownership And Storage Boundaries

- Browser users read transcripts and segments only through existing authenticated Supabase RLS policies.
- `getTranscriptForRecording` uses the authenticated server client. Missing and RLS-hidden rows both return `null`; Supabase errors become a generic query error.
- Private audio is read only by the worker-side recording source through the service-role client. No signed read URL or storage path is sent to the provider.
- The provider adapter receives in-memory bounded bytes, filename, and MIME type. Provider failures are translated to existing safe failure codes; raw provider and database details are not returned to users.

## Meeting Detail States

- No recording: no transcript section is displayed.
- Queued or running job: a semantic status placeholder announces that transcription is being generated.
- Completed transcript: normalized content, detected language, and timestamped ordered segments are displayed.
- Failed or cancelled job: a neutral, safe empty state is shown without raw failure details.
- Archived meeting: existing transcript content remains visible and is explicitly read-only. No transcript mutation controls are added.
- Existing route `loading.tsx` and `error.tsx` boundaries cover transcript query loading and safe query errors.

## Accessibility Checks

- Transcript section uses a level-two heading and segment subheading.
- Pending and empty states expose semantic `status` content.
- Segment timings are rendered as text, not color-only information, in an ordered list labelled `转录分段`.
- Transcript text preserves line breaks and remains readable at narrow widths.

## Automated Verification

The Task 7 completion gate runs:

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

Focused coverage includes owner-scoped transcript reads, missing/RLS-hidden behavior, safe query failures, meeting-detail data flow, pending/empty transcript state, content and segment rendering, and archived read-only behavior.

## Operational Risks And Follow-Up

- A remote Supabase environment must apply all three Sprint 6 migrations before the worker can persist transcripts.
- The Vercel Cron route, deployment secrets, configured provider input-size limit, and live two-user RLS behavior require environment-level verification before release.
- A worker crash after an external provider response but before RPC completion can require a later retry and may incur a duplicate provider charge. Transcript persistence remains protected by its recording uniqueness constraint.
- Transcript editing, playback, export, summaries, action extraction, and AI chat remain intentionally out of scope.
