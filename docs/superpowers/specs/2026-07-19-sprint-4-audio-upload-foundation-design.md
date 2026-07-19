# Sprint 4 Audio Upload Foundation Design

## Status

Approved for implementation on 2026-07-19.

## Objective

Allow an authenticated meeting owner to upload one active audio recording to a meeting. Sprint 4 establishes private recording storage and reliable upload state only. It does not process audio.

## Scope

Included:

- Recording metadata in PostgreSQL
- Private `recordings` Supabase Storage bucket
- Direct browser-to-Storage upload using a signed upload URL
- Upload progress, cancellation, failure, retry, and completed states
- Recording status on the meeting detail route
- Owner-only database and object access

Excluded:

- Whisper, transcription, processing jobs, summaries, action items, AI, or agents
- Recording playback, public sharing, downloads, replacement history, bulk upload, and dashboard recording metrics
- API route handlers and service-role credentials

Each meeting may have one active recording. Failed and cancelled attempts remain as operational history and do not prevent a later retry.

## Database

Create `public.recordings` with:

| Column                     | Definition                                                    |
| -------------------------- | ------------------------------------------------------------- |
| `id`                       | UUID primary key                                              |
| `meeting_id`               | Required FK to `public.meetings(id)` with `on delete cascade` |
| `user_id`                  | Required FK to `auth.users(id)` with owner default            |
| `storage_bucket`           | Required fixed value `recordings`                             |
| `storage_path`             | Required unique object path                                   |
| `original_filename`        | Required trimmed display filename                             |
| `mime_type`                | Required allowlisted audio MIME type                          |
| `file_size_bytes`          | Required positive integer up to 524288000 bytes               |
| `status`                   | Required upload lifecycle value                               |
| `uploaded_at`              | Null until object verification succeeds                       |
| `created_at`, `updated_at` | UTC timestamps; `updated_at` uses the existing trigger        |

Allowed statuses are `pending`, `uploading`, `uploaded`, `failed`, and `cancelled`.

Indexes and constraints:

- Unique `(storage_bucket, storage_path)`
- Partial unique index on `meeting_id` only while `status in ('pending', 'uploading', 'uploaded')`
- Owner lookup index on `(user_id, meeting_id, created_at desc)`
- Filename must be non-empty and no longer than 255 characters
- MIME type must be one of `audio/mpeg`, `audio/mp4`, `audio/wav`, or `audio/webm`
- Size must be between 1 byte and 500 MB

The partial index intentionally permits multiple failed or cancelled rows for one meeting.

## Storage Architecture

Create a private Supabase Storage bucket named `recordings` with:

- `file_size_limit = 524288000`
- `allowed_mime_types` set to the approved audio allowlist where the deployed Storage version supports bucket MIME restrictions
- No public object URLs

Object paths are deterministic:

```text
{user_id}/{meeting_id}/{recording_id}.{extension}
```

The Server Action creates the database intent and a signed upload URL. Signed upload URLs use the Supabase Storage SDK managed short-lived expiration window. The application does not implement custom signing or override provider expiry. URLs are generated only after authenticated owner verification. The browser uploads only bytes through that short-lived URL and never writes recording metadata directly.

## Upload Lifecycle

1. Client validates selected file type and size, then requests an upload intent.
2. Server Action repeats metadata validation, verifies the authenticated meeting owner, inserts a `pending` recording, transitions it to `uploading`, and issues a Supabase Storage SDK managed short-lived signed upload URL.
3. Browser uploads directly to the private bucket and exposes progress.
4. Client calls a Server Action to finalize; it verifies the expected object exists and marks the row `uploaded` with `uploaded_at`.
5. Cancel marks the current attempt `cancelled` and makes a best-effort owner-scoped object removal.
6. Upload or finalization failure marks the attempt `failed`. No raw Storage error is persisted or displayed.
7. Retry always creates a new recording intent. Failed and cancelled rows remain operational history.

`uploaded` is terminal in Sprint 4. Uploading is disabled for archived meetings.

## Security

`recordings` uses RLS. All policies apply to `authenticated` only:

- Select only rows where `auth.uid() = user_id`
- Insert only when `auth.uid() = user_id` and the target meeting belongs to `auth.uid()`
- Update only the owner-visible row; Server Actions additionally enforce valid transitions
- No application delete workflow in Sprint 4

Storage object policies restrict the `recordings` bucket to paths whose first segment equals `auth.uid()::text`. Authenticated owners receive select, insert, and delete permissions only for their own path prefix. The application does not use a service role.

## Three-Layer Size Validation

The 500 MB limit is enforced at every applicable boundary:

1. Client: reject selected files before issuing an upload intent.
2. Server Action: Zod validates `fileSizeBytes` before inserting an intent or issuing a signed URL.
3. Storage: the private bucket receives `file_size_limit = 524288000` where supported by the deployed Supabase Storage configuration.

MIME type follows the same client, Server Action, and bucket-configuration pattern where supported.

## UI And Data Flow

The meeting detail page receives an owner-scoped recording query in its Server Component. A client upload form is rendered only for an active meeting without an active recording.

The form provides a labelled file picker, allowed-file help, selected file metadata, progress indicator, cancel, retry, and Chinese live-region feedback. The completed state displays the filename, size, and uploaded time. It does not provide playback or download.

Unauthorized or missing meetings continue to use existing not-found behavior. Storage and database details never reach the UI.

## Testing And Acceptance

Tests cover migration contract, RLS/policy SQL, schema boundaries, query ownership, action authorization and transition behavior, client upload states, accessibility, and the one-active-recording invariant. Browser QA covers desktop, tablet, mobile, keyboard operation, file validation, upload progress, cancel, retry, and archived meeting behavior.

Sprint 4 is accepted when an owner can upload a valid audio file to an active meeting, the object is private, one active recording is enforced per meeting, failure/cancellation preserves history without blocking retry, and no excluded processing or AI feature exists.
