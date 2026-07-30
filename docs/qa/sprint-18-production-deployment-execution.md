# Sprint 18 Production Deployment Execution Checklist

## Scope And Result

This document records a read-only Production deployment verification performed
on 2026-07-30. No Vercel deployment, environment-variable mutation, Supabase
database push, schema change, migration, worker change, or RAG contract change
was performed.

**Current release decision: NO-GO.** The currently linked remote Supabase
project has seven pending migrations, and Vercel account/project/Production
environment state could not be verified from this workspace.

## Verification Evidence

| Check                             | Result                 | Evidence                                                                                                                              |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel Cron source configuration  | Verified in repository | `vercel.json` schedules transcription, Meeting Intelligence, and Meeting Knowledge every five minutes.                                |
| Built Cron routes                 | Verified locally       | The production build includes all three `/api/cron/*` routes.                                                                         |
| Vercel project linkage            | Not verified           | No `.vercel` directory is present in this workspace.                                                                                  |
| Vercel authenticated CLI access   | Not verified           | Vercel CLI was not installed; a temporary read-only `vercel whoami` attempt timed out after 124 seconds. No deployment was attempted. |
| Production environment variables  | Not verified           | No linked Vercel project or completed Vercel CLI query was available. Values were never read or printed.                              |
| Public/server secret boundary     | Verified in repository | `.env.example` excludes secrets; runtime configuration keeps worker and provider keys server-only.                                    |
| Supabase linked remote connection | Verified               | `supabase migration list` successfully queried the currently linked remote project.                                                   |
| Supabase Production designation   | Not verified           | The repository proves a remote link, not that the linked project is the intended Production project.                                  |
| Remote migration parity           | Failed                 | Migrations `202607270001` through `202607280005` are local-only and pending remotely.                                                 |
| Production build                  | Verified locally       | `npm run build` completed successfully on 2026-07-30 and included all three Cron routes.                                              |

## 1. Vercel Project And Cron Configuration

Repository configuration contains the following required routes and schedules:

| Route                            | Schedule      | Runtime responsibility                                       |
| -------------------------------- | ------------- | ------------------------------------------------------------ |
| `/api/cron/transcription`        | `*/5 * * * *` | Claims and processes the next transcription job.             |
| `/api/cron/meeting-intelligence` | `*/5 * * * *` | Claims and processes the next Meeting Intelligence job.      |
| `/api/cron/meeting-knowledge`    | `*/5 * * * *` | Claims and processes the next chunk/embedding knowledge job. |

All three routes validate `Authorization: Bearer <CRON_SECRET>` before creating
a provider or invoking a worker. The knowledge route returns `403` for an
unauthorized request and a generic `500` response on worker/provider failure.

### Required Vercel Operator Actions

1. Authenticate the Vercel CLI or link this directory to the intended project.
2. Confirm the selected Vercel plan supports all three five-minute schedules.
3. Confirm the Vercel Production deployment uses the commit selected for
   release and recognizes all three Cron entries.
4. Confirm Vercel Cron sends the expected bearer authorization header.
5. Invoke all three routes with invalid authorization and confirm safe rejection;
   then validate authorized idle, completed, and safe failure responses using
   non-sensitive test data.

## 2. Production Environment Variables

The following names must be reviewed in Vercel **Production** settings without
printing their values. Server-only secrets must never use a `NEXT_PUBLIC_`
prefix.

| Variable                        | Required state                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Exact Production HTTPS origin.                                                      |
| `NEXT_PUBLIC_SUPABASE_URL`      | HTTPS URL for the intended Production Supabase project.                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key for that same project.                                                |
| `CRON_SECRET`                   | Non-empty, server-only; identical value used by Vercel Cron authorization.          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Non-empty, server-only; present only to server worker routes.                       |
| `AI_PROVIDER`                   | `deepseek` for the approved production Chat path.                                   |
| `DEEPSEEK_API_KEY`              | Non-empty, server-only when DeepSeek is selected.                                   |
| `DEEPSEEK_MODEL`                | `deepseek-chat` unless an approved model selector differs.                          |
| `OPENAI_API_KEY`                | Non-empty, server-only when Whisper transcription is enabled.                       |
| `EMBEDDING_PROVIDER`            | `mock` only for local/Preview Demo; do not represent it as production semantic RAG. |

`EMBEDDING_API_KEY` and `EMBEDDING_MODEL` are required only after a separately
approved real 1536-dimension embedding provider is selected. Do not configure
`EMBEDDING_PROVIDER=deepseek` under the current provider policy.

## 3. Supabase Link And Migration Readiness

The Supabase CLI successfully connected to the currently linked remote project.
The local and remote histories match through `202607260001`.

The following local migrations are missing remotely:

1. `202607270001_add_meeting_ai_messages.sql`
2. `202607270002_add_action_items.sql`
3. `202607280001_extend_ai_usage_events.sql`
4. `202607280002_create_meeting_knowledge_base.sql`
5. `202607280003_add_meeting_knowledge_job_leases.sql`
6. `202607280004_create_knowledge_job_after_transcription.sql`
7. `202607280005_add_vector_retrieval_rpc.sql`

This remote state is **not ready** for the committed Copilot, action-item,
knowledge worker, usage-event extension, or RAG retrieval functionality.

### Required Supabase Operator Actions

1. Confirm the linked project reference is the intended Production project.
2. Review all seven pending migration files, including RLS, service-role grants,
   knowledge job leases, `vector` extension, HNSW index, and retrieval RPC.
3. Take the approved Production backup/change-management action required by
   the operating team.
4. Run `supabase db push --project-ref <approved-production-project-ref>` only
   after review. This task intentionally did not run it.
5. Re-run `supabase migration list --project-ref <approved-production-project-ref>`
   and require full local/remote parity.
6. Verify owner isolation with non-sensitive test accounts for meetings,
   transcripts, action items, knowledge jobs, chunks, retrieval, and usage
   events.

## 4. Secret Boundary Findings

Repository checks confirm:

- `.env.example` contains only public Supabase values and non-sensitive
  provider selectors.
- `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are parsed from server-only
  worker configuration.
- DeepSeek, OpenAI, and embedding keys are read from server configuration,
  not `NEXT_PUBLIC_` variables.
- Cron routes expose only safe status/error responses and do not return
  service-role or provider credentials.

The actual Vercel Production configuration remains unverified until the
operator performs the environment-name and scope review above.

## 5. Production Execution Gate

Do not deploy or promote until every item is checked:

- [ ] Vercel account/project access is verified and the project is linked.
- [ ] Vercel Production variable names and scopes match this document without
      exposing their values.
- [ ] Vercel plan supports all three five-minute Cron schedules.
- [ ] The intended Supabase project reference is confirmed as Production.
- [ ] All seven pending migrations are reviewed, applied, and shown as remote
      parity by `supabase migration list`.
- [ ] Auth Site URL, redirect URLs, and `NEXT_PUBLIC_APP_URL` are the same
      Production HTTPS origin.
- [ ] Cron authorization and each worker route pass safe smoke tests.
- [ ] DeepSeek Chat and Whisper perform redacted success/failure smoke tests.
- [ ] Knowledge indexing is smoke-tested with the configured embedding policy.
- [ ] Production semantic RAG remains disabled unless a real approved 1536-
      dimension embedding provider has been configured and data re-indexed.
- [ ] Fresh `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
      and `git diff --check` pass on the final promotion commit.

## Rollback Constraint

If a deployment fails, promote the last verified Vercel Production deployment
or use the approved provider fallback. Do not roll back migrations, weaken RLS,
delete Production data, expose secrets, or bypass Cron authorization. Use a
separately reviewed forward-only migration for database remediation.
