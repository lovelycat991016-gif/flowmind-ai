# Sprint 4 Audio Upload QA

## Automated Verification

The final Task 7 handoff records fresh Prettier, ESLint, strict TypeScript, full Vitest suite, production build, and Git diff verification. Focused tests cover the recordings migration contract, domain validation, lifecycle transitions, owner-scoped query behavior, Server Action authorization, signed upload intent handling, upload-form interaction, and meeting-detail recording states.

## Migration Verification

- Migration contract tests verify the `recording_upload_status` enum, recordings metadata, 500 MB database constraint, MIME allowlist, partial unique active-recording index, timestamp trigger, RLS policies, private bucket configuration, and Storage object policies.
- The migration is delivered as `supabase/migrations/202607190001_create_recordings.sql`.
- No remote migration application is claimed here. Applying the migration requires Supabase CLI credentials or the configured project's SQL Editor.

## RLS And Storage Policy Notes

- Database tests verify the delivered RLS policy contract, including meeting ownership verification during recording insert.
- Query and Server Action tests model RLS-hidden rows as `null` and keep provider details out of user-facing results.
- Storage policies restrict the private `recordings` bucket to authenticated users whose first object-path segment matches `auth.uid()`.
- Live cross-user RLS and Storage policy verification remains pending a configured Supabase test project with two authenticated users.

## Upload Flow Verification

- Metadata validation rejects unsupported MIME types and files over 500 MB before an upload intent is issued.
- The Server Action repeats validation and meeting ownership checks before inserting a pending recording row.
- Supabase Storage SDK creates the managed short-lived signed upload URL only after owner verification.
- Browser upload uses the signed URL directly; successful object verification transitions the row to `uploaded`.
- Cancellation aborts the browser request and requests the `cancelled` transition. Retry creates a new intent rather than reusing failed or cancelled rows.

## Responsive Browser QA Checklist

The following must be exercised against a configured authenticated local or deployed environment at desktop `1440x1000`, tablet `1024x900`, and mobile `390x844`:

- Select a valid MP3, MP4, WAV, and WebM file and observe stable layout, filename, progress, completion, and uploaded metadata.
- Reject unsupported and oversized files with readable Chinese feedback.
- Confirm progressbar semantics, keyboard file selection, cancel, retry, and live-region announcements.
- Confirm uploaded recordings remain readable on archived meetings while new uploads are unavailable.
- Confirm owner access succeeds and a second authenticated user cannot read, upload, finalize, or list the first user's recording/object.

No live browser session or configured remote Supabase credentials were available in this workspace, so this checklist is intentionally not reported as completed.

## Known Operational Risks

- A failed or cancelled attempt can leave a private abandoned Storage object if the browser uploaded bytes before the state transition.
- Automated Storage cleanup, retention rules, playback, transcription, summaries, action extraction, and background jobs are deferred and outside Sprint 4.
