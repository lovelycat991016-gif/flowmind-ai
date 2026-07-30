# Sprint 18 Production Deployment Readiness Checklist

## Scope And Evidence

This is a read-only deployment readiness audit for the FlowMind AI release on
2026-07-30. It does not change application code, database schema, migrations,
RLS, AI providers, workers, or the RAG retrieval contract.

Legend:

- **Verified**: confirmed from the repository or a fresh local command.
- **Operator verification required**: must be checked in the intended Vercel
  Production and Supabase projects; it cannot be proven from this repository.
- **Release blocker**: resolve or explicitly defer before representing the
  affected capability as Production-ready.

## Readiness Summary

| Area                         | Status                         | Evidence or action                                                                    |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Production build             | Verified                       | `npm run build` completed successfully on 2026-07-30.                                 |
| Public environment contract  | Verified                       | `.env.example` exposes only public Supabase values and non-sensitive selectors.       |
| Service-role boundary        | Verified                       | Worker configuration reads `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` server-side. |
| Vercel Cron configuration    | Partial                        | Two protected Cron routes are configured every five minutes.                          |
| Supabase migration history   | Operator verification required | Compare all local versions below with the target project before deployment.           |
| DeepSeek Chat                | Operator verification required | Configure production secret and perform a redacted successful/failure check.          |
| Production semantic RAG      | Release blocker                | Mock embedding is not a production semantic embedding solution.                       |
| Knowledge indexing execution | Release blocker                | The knowledge worker exists, but no Vercel Cron route/schedule invokes it.            |

## 1. Environment Variable Checklist

Configure the following values only in the Vercel **Production** environment.
Values marked server-only must not begin with `NEXT_PUBLIC_`, appear in source
control, be returned by Server Actions, or be placed in logs.

| Variable                                  | Scope                         | Required for                                                             | Status                                                           |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                     | Public                        | Exact Production HTTPS application URL                                   | Operator verification required                                   |
| `NEXT_PUBLIC_SUPABASE_URL`                | Public                        | The intended Production Supabase project URL                             | Operator verification required                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | Public                        | Browser Supabase client for that same project                            | Operator verification required                                   |
| `CRON_SECRET`                             | Server-only secret            | Authorization for worker Cron routes                                     | Operator verification required                                   |
| `SUPABASE_SERVICE_ROLE_KEY`               | Server-only secret            | Server-side worker repositories                                          | Operator verification required                                   |
| `AI_PROVIDER=deepseek`                    | Server-only selector          | DeepSeek Chat for Meeting Intelligence and Copilot                       | Operator verification required                                   |
| `DEEPSEEK_API_KEY`                        | Server-only secret            | DeepSeek Chat when selected                                              | Operator verification required                                   |
| `DEEPSEEK_MODEL=deepseek-chat`            | Server-only selector          | DeepSeek model choice                                                    | Operator verification required                                   |
| `OPENAI_API_KEY`                          | Server-only secret            | Whisper transcription route                                              | Operator verification required                                   |
| `EMBEDDING_PROVIDER=mock`                 | Server-only selector          | Local/Preview deterministic fixture boundary only                        | Verified in committed example; not valid production semantic RAG |
| `EMBEDDING_API_KEY` and `EMBEDDING_MODEL` | Server-only secrets/selectors | Only after an approved real 1536-dimension embedding provider is enabled | Not configured by current strategy                               |

### Environment Acceptance

- [ ] Vercel Production values use the Production Supabase project, not a local
      or Preview project.
- [ ] `NEXT_PUBLIC_APP_URL`, Supabase Auth Site URL, and allowed redirect URLs
      all use the same exact HTTPS application origin.
- [ ] No key has a `NEXT_PUBLIC_` prefix.
- [ ] No API key is stored in `.env.example`, committed `.env*` files, or
      deployment evidence.
- [ ] A missing DeepSeek, OpenAI, service-role, or Cron secret produces only a
      generic safe error, never the secret value.

## 2. Supabase Migration Deployment Checklist

Local migrations are ordered by their versioned filenames and must be applied
to the target project in this exact order:

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
11. `202607250001_repair_meeting_intelligence_worker.sql`
12. `202607250002_restrict_meeting_intelligence_claim_rpc.sql`
13. `202607250003_add_manual_intelligence_input.sql`
14. `202607260001_complete_transcription_with_intelligence.sql`
15. `202607270001_add_meeting_ai_messages.sql`
16. `202607270002_add_action_items.sql`
17. `202607280001_extend_ai_usage_events.sql`
18. `202607280002_create_meeting_knowledge_base.sql`
19. `202607280003_add_meeting_knowledge_job_leases.sql`
20. `202607280004_create_knowledge_job_after_transcription.sql`
21. `202607280005_add_vector_retrieval_rpc.sql`

### Operator Procedure

1. Confirm the Production project reference through an approved source, not a
   remembered CLI link.
2. Run `supabase migration list --project-ref <production-project-ref>`.
3. Compare the remote history to the 21 local versions above. Stop on any
   unexpected, missing, altered, or out-of-order version.
4. Review pending SQL, especially RLS policies, grants, RPC privileges, the
   `vector` extension, and the HNSW index.
5. After approval, run `supabase db push --project-ref <production-project-ref>`.
6. Run `supabase migration list --project-ref <production-project-ref>` again
   and record only migration versions and outcome, never credentials or data.
7. Run post-deploy owner-isolation checks for meetings, transcripts,
   intelligence, action items, knowledge jobs, chunks, vector retrieval, and
   AI usage events.

## 3. Service-Role And Secret Boundary

**Verified from code**:

- `createWorkerServiceRoleClient()` reads the public Supabase URL plus the
  server-only `SUPABASE_SERVICE_ROLE_KEY`.
- `getWorkerEnv()` validates non-empty `CRON_SECRET` and service-role key.
- Both deployed Cron routes require `Authorization: Bearer <CRON_SECRET>`.
- Provider configuration reads `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, and any
  future embedding key only on server code paths.
- The public environment parser rejects server-only values when they are passed
  into the public configuration boundary.

### Operator Verification

- [ ] Confirm only server-side Vercel functions have access to secrets.
- [ ] Invoke each Cron endpoint with an invalid authorization header and expect
      HTTP 401 without details.
- [ ] Invoke each scheduled route through the configured Cron authorization and
      inspect only redacted status/log output.
- [ ] Confirm the Production service-role key is never added to Preview,
      Development, browser environment variables, or manual support tooling.

## 4. Vercel Deployment Checklist

**Verified from repository**:

- `vercel.json` defines `/api/cron/transcription` and
  `/api/cron/meeting-intelligence` with `*/5 * * * *` schedules.
- Both routes appear in the fresh production build.
- Next.js disables the `X-Powered-By` header, enables Strict Mode, and builds
  typed routes.
- `.gitignore` excludes `.env*` except `.env.example`, `.vercel`, and local
  Supabase state.

### Operator Verification

- [ ] Confirm the selected Vercel plan supports the configured five-minute
      schedules before Production promotion.
- [ ] Set every required Production environment variable and redeploy.
- [ ] Confirm Vercel Cron sends the expected bearer authorization header.
- [ ] Validate `/login`, sign-up verification, password login, a protected
      dashboard route, an owner-scoped meeting route, and sign-out.
- [ ] Verify a completed transcription and Meeting Intelligence job in a
      non-sensitive release fixture.
- [ ] Inspect a redacted successful and failed `ai_usage_events` row and logs;
      confirm they contain no prompt, transcript, audio, key, raw provider body, or
      raw provider error.

## 5. AI And RAG Deployment Boundaries

### DeepSeek Chat

DeepSeek Chat is production-configurable when `AI_PROVIDER=deepseek`,
`DEEPSEEK_API_KEY`, and `DEEPSEEK_MODEL` are set server-side. Before release,
verify one successful Meeting Intelligence request and one safe provider failure
without storing or exposing provider payloads.

### Embeddings And Retrieval

The existing database and retrieval contract are ready for an approved
1536-dimension embedding provider: chunks store `vector(1536)`, the HNSW index
is created by migration, and `match_meeting_document_chunks` uses
`auth.uid()` plus a maximum of 20 results. However,
`EMBEDDING_PROVIDER=mock` is explicitly a local/Preview fixture boundary.

**Release blocker for Production semantic RAG**: do not market or enable
semantic RAG until a real server-only embedding provider is approved, configured
with `EMBEDDING_API_KEY` and `EMBEDDING_MODEL`, validated at 1536 dimensions,
and used to re-index Production data under a separate approved plan.

## 6. Deployment Risks And Required Decisions

| Risk                                               | Impact                                                                                                                                    | Required action                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Knowledge worker lacks a deployed invocation route | Completed transcripts create knowledge jobs that will not be processed automatically; new Production chunks/embeddings can remain queued. | Add and review an invocation strategy in a separate task before enabling production knowledge indexing or semantic RAG. |
| Mock embedding in Production                       | Retrieval output is deterministic demo behavior, not semantic relevance.                                                                  | Keep it restricted to local/Preview demos; block production RAG claims.                                                 |
| Vercel schedule availability is unverified         | Configured five-minute Cron may not run on the selected plan.                                                                             | Verify plan capability and first scheduled executions.                                                                  |
| Remote migration history is unverified             | Schema/RLS/RPC state may differ from the repository.                                                                                      | Compare and apply migrations using the operator procedure.                                                              |
| Provider credentials are not auditable from source | Chat/transcription jobs can fail at runtime despite a successful build.                                                                   | Configure server-only secrets and run redacted success/failure smoke checks.                                            |
| One job processed per Cron invocation              | Queue backlog can grow under sustained volume.                                                                                            | Monitor queued/lease-expired jobs and establish an operational throughput target before scaling access.                 |

## Production Go/No-Go Gate

Do not promote the release until every item below is true:

- [ ] Fresh `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and
      `git diff --check` pass on the promotion commit.
- [ ] Environment and secret acceptance items are complete.
- [ ] Remote migration history matches the ordered list and deployment is
      confirmed.
- [ ] Auth redirect URLs and public application URL match the Production origin.
- [ ] Cron authorization and the two configured worker routes are smoke-tested.
- [ ] Owner isolation is validated against the Production project using
      non-sensitive test data.
- [ ] The knowledge worker invocation risk is resolved or knowledge indexing and
      semantic RAG are explicitly disabled for Production.
- [ ] Production RAG is not claimed while `EMBEDDING_PROVIDER=mock` remains in
      use.

## Rollback

For an application-only issue, promote the last verified Vercel Production
deployment. For a provider incident, use the approved safe provider fallback
and redeploy. Do not reverse deployed migrations, delete Production data, weaken
RLS, expose service-role credentials, or bypass Cron authorization. Database
remediation must use a separately reviewed forward-only migration.
