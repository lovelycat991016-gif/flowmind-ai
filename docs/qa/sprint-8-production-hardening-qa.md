# Sprint 8 Production Hardening QA

## Scope

This checklist verifies the existing Supabase production boundary for private beta. It does not change migrations, RLS policies, Storage policies, worker behavior, transcription behavior, or meeting-intelligence behavior.

Record the following evidence for each live check: environment, migration version, date and time, verifier, pass or fail result, and a redacted incident reference when relevant. Never record an access token, service-role key, transcript, audio path, signed URL, or customer email in this document.

## Migration Verification

Apply migrations in this exact filename order:

1. `202607140001_create_profiles.sql`
2. `202607160001_create_meetings.sql`
3. `202607190001_create_recordings.sql`
4. `202607190002_create_processing_jobs.sql`
5. `202607200001_add_transcription_processing.sql`
6. `202607200002_add_processing_job_leases.sql`
7. `202607200003_add_transcription_execution.sql`
8. `202607210001_add_meeting_intelligence.sql`
9. `202607210002_add_meeting_intelligence_worker.sql`
10. `202607210003_add_ai_usage_events.sql`

Before inviting beta users, verify the target Supabase migration history contains each version once and no later migration has been applied out of order. Confirm these production contracts after application:

- `meetings`, `recordings`, `processing_jobs`, `transcripts`, `transcript_segments`, `meeting_intelligence`, and `ai_usage_events` have RLS enabled.
- The `recordings` bucket is private, limits uploads to 500 MB, and only permits MP3, MP4, WAV, and WebM audio.
- Recording object policies constrain the first path segment to the authenticated user ID.
- The transcription claim, completion, and failure RPCs revoke public access and grant execution only to `service_role`.
- The meeting-intelligence claim RPC revokes public access and grants execution only to `service_role`.

Automated coverage: `src/shared/lib/supabase/production-contract.test.ts` checks release migration order and representative RLS, private Storage, and service-role RPC contracts. It does not replace live Supabase verification.

## RLS Owner Isolation

Use two confirmed users, User A and User B, with separate browser sessions.

1. As User A, create a meeting and an upload intent. Record only generated IDs in the private test log.
2. As User B, attempt to list, query by ID, rename, archive, restore, or delete User A's meeting. Each operation must return no row, a safe generic error, or the existing non-disclosing not-found response.
3. As User B, attempt to read User A's recording metadata, processing job, transcript, transcript segments, and meeting intelligence. Each read must behave as absent; no content, storage path, provider metadata, or safe failure code for User A may be exposed.
4. As User A, confirm all of the same owned records remain readable through normal application flows.
5. Archive User A's meeting and verify existing transcript and intelligence views remain read-only. Do not create an upload or mutation as User B.

Expected result: every application user read is constrained by the authenticated owner, while hidden rows remain indistinguishable from missing rows at the user interface.

## Storage Privacy

1. Verify the `recordings` bucket is not public in the Supabase Storage dashboard.
2. Upload an allowed audio file as User A and confirm its object path begins with User A's UUID.
3. In a User B browser session, attempt a direct authenticated Storage object list/read/delete against User A's path. The request must be denied or return no object.
4. Verify an anonymous request cannot retrieve User A's object.
5. Confirm signed upload URLs are generated only after authenticated owner and meeting checks. Do not log or share the URL while performing this check.
6. Attempt a disallowed MIME type and an over-500 MB metadata request. The application must reject them before Storage upload begins.

Expected result: objects are private, object-prefix policies bind objects to their owner, and public URLs are never used.

## Service-Role Separation

1. Confirm `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are present only in Vercel server environment settings. They must not appear in `.env.example`, browser bundles, `NEXT_PUBLIC_*` variables, client logs, or commit history.
2. Call a worker-protected RPC as an authenticated user session. It must fail with authorization denial.
3. Trigger the existing protected worker mechanism with a valid Cron authorization header in the beta environment. Confirm it can claim only its intended queued job and uses the service-role client server-side.
4. Use an invalid or missing bearer token. The worker authorization boundary must reject the request before any service-role database operation.
5. Confirm logs contain only safe error categories and no keys, raw provider errors, audio bytes, transcript contents, or signed URLs.

Expected result: browser users cannot exercise worker RPCs or access service-role credentials; only the protected server worker can use that boundary.

## Observability Verification

Automated status: verified by `src/shared/observability/server.test.ts`.

1. Trigger a safe server-side failure in the beta environment using a non-customer test record.
2. Verify the deployment log event contains only a correlation ID, category, operation, outcome, safe identifiers, duration where available, and a safe failure code.
3. Verify the event does not contain audio bytes, Storage paths, signed URLs, cookies, authorization headers, transcript text, prompts, provider responses, API keys, or arbitrary nested error data.
4. Confirm the user-visible error remains the existing generic, non-disclosing message.

Expected result: production debugging has correlated, redacted server logs without exposing customer or credential data.

## AI Usage Ledger Verification

Automated status: verified by `src/features/meeting-intelligence/usage/ai-usage-migration.test.ts` and `src/features/meeting-intelligence/usage/ai-usage-input.test.ts`.

1. After an intelligence generation attempt, verify one `ai_usage_events` row is associated with the matching intelligence record and owner.
2. Re-run the same attempt identifier and verify the unique attempt key prevents duplicate ledger rows.
3. Confirm an authenticated browser user can read only their own ledger entries and cannot insert, update, or delete any entry.
4. Confirm provider/model identifiers, token counts, and estimated cost remain nullable when the provider does not safely supply them.
5. Confirm a ledger write failure is recorded only as an operational event and does not change the intelligence completion or failure outcome.

Expected result: the append-only ledger records safe, owner-linked operation metadata without enabling billing, quotas, or customer-facing analytics.

## Beta Onboarding Verification

Automated status: verified by `src/widgets/dashboard/ui/beta-onboarding.test.tsx` and `src/features/dashboard/ui/dashboard-view.test.tsx`.

1. Use a new beta account with no meetings and verify the dashboard shows the Chinese first-use panel.
2. Verify the ordered flow communicates: create a meeting, upload audio, wait for processing, then review transcript and intelligence.
3. Navigate by keyboard to the create-meeting link and verify it targets `/meetings/new`.
4. Create one meeting and verify the first-use panel no longer appears.
5. Check desktop, tablet, and mobile widths in the target beta environment for readable text wrapping and no clipped controls.

Expected result: the non-persistent panel improves feature discovery without changing authentication, data, or workflow state.

## Release Evidence

| Check                                 | Environment | Verifier | Date | Result | Redacted Reference |
| ------------------------------------- | ----------- | -------- | ---- | ------ | ------------------ |
| Migration order                       |             |          |      |        |                    |
| User A/User B RLS isolation           |             |          |      |        |                    |
| Private Storage isolation             |             |          |      |        |                    |
| Service-role RPC denial and allowance |             |          |      |        |                    |
| Cron authorization                    |             |          |      |        |                    |
| Redacted observability event          |             |          |      |        |                    |
| AI usage ledger isolation             |             |          |      |        |                    |
| Beta onboarding and responsive layout |             |          |      |        |                    |

## Known Limitations

- Automated source-contract tests verify committed migration text; they cannot prove a remote Supabase project applied that text.
- This task does not create a new observability backend, customer-facing usage analytics, or a live provider transport.
- Rate limits, provider quotas, Vercel Cron schedule behavior, and private-beta operational alerts must be validated in the target environment before broadening access.
- The AI usage ledger is an internal, best-effort metadata foundation. It does not provide billing, quotas, invoices, or a customer analytics view.
- Browser-based responsive verification must be recorded against the deployed beta environment because the local browser companion may not retain a development server between command sessions.
