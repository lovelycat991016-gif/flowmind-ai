# Sprint 17 Production Deployment Checklist

## Scope

This checklist prepares an existing FlowMind release for Production deployment.
It does not authorize a schema change, migration authoring, RLS modification,
provider architecture change, or worker lifecycle change. Do not record keys,
URLs containing credentials, meeting content, prompts, raw provider responses,
or user data in release evidence.

## Environment Inventory

Configure values in Vercel Production only. `.env.example` contains public
values and non-sensitive selectors, never secrets.

| Variable | Placement | Requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public Vercel variable | Exact HTTPS Production application URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Vercel variable | HTTPS URL for the intended Production Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Vercel variable | Non-empty anonymous key for that same project. |
| `AI_PROVIDER=deepseek` | Server-only Vercel variable | Enables the approved DeepSeek Chat adapter. |
| `DEEPSEEK_MODEL=deepseek-chat` | Server-only Vercel variable | Production Chat model selector. |
| `EMBEDDING_PROVIDER=mock` | Server-only Vercel variable | Current boundary only; it is not semantic production RAG. |
| `CRON_SECRET` | Server-only Vercel secret | Authenticates the two cron routes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Vercel secret | Used only by worker and fixture service-role boundaries. |
| `DEEPSEEK_API_KEY` | Server-only Vercel secret | Required when `AI_PROVIDER=deepseek`. |
| `OPENAI_API_KEY` | Server-only Vercel secret | Required only when Production transcription is enabled. |

`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`,
`OPENAI_API_KEY`, and any future `EMBEDDING_API_KEY` must not use a
`NEXT_PUBLIC_` prefix. They must not be committed, emitted by Server Actions,
available to client components, or copied into deployment logs.

Do not set `EMBEDDING_PROVIDER=deepseek`. Mock embedding is allowed for the
current demonstration boundary only. A Production claim of semantic RAG
requires a separately approved real 1536-dimension embedding provider and
re-index plan.

## Supabase Migration Deployment

1. Confirm the target project reference is the intended Production project;
   do not rely on a remembered CLI link.
2. Run `supabase migration list --project-ref <production-project-ref>` and
   compare remote and local history.
3. Review every pending migration, including its RLS impact. Stop if the list
   contains an unexpected migration or a migration that was previously edited.
4. After the target and migration list are approved, run
   `supabase db push --project-ref <production-project-ref>`.
5. Run `supabase migration list --project-ref <production-project-ref>` again
   and record only the migration versions and pass/fail outcome.
6. Perform owner-isolation checks against the deployed project. Do not weaken
   RLS to diagnose a release issue.

This task does not run `supabase db push`; the command is a controlled
Production operator step after review.

## Vercel Deployment Requirements

1. Select the Production environment and the intended Git commit.
2. Verify public URLs are HTTPS and Supabase Auth Site URL, redirect URLs, and
   `NEXT_PUBLIC_APP_URL` refer to the same Production application URL.
3. Verify the public Supabase URL and anonymous key refer to the same project
   as the reviewed migration list.
4. Verify each server-only secret is present only in Production settings and
   no secret has a `NEXT_PUBLIC_` name.
5. Confirm `vercel.json` schedules both Vercel Cron routes: transcription and
   Meeting Intelligence.
6. Deploy, then verify `/login`, signup verification, an existing password
   login, a protected route, and the two cron endpoints using the configured
   cron authorization.
7. Inspect a redacted successful and failed Usage Event and deployment log.
   Confirm they exclude keys, prompts, transcripts, raw provider responses,
   and raw provider errors.

## Release Gate

Run from the release commit before Production promotion:

`npm test`
`npm run lint`
`npm run typecheck`
`npm run build`
`git diff --check`

Block release if any command fails, a required environment variable is absent,
the Supabase target differs from the reviewed project, an unexpected migration
is pending, a secret is public, or owner isolation fails.

## Rollback

For an application-only release issue, promote the last verified Vercel
Production deployment and preserve redacted deployment references. For a
provider incident, disable the affected provider configuration or use the
approved mock fallback, then redeploy. Do not reverse a deployed migration,
delete Production data, alter RLS, or bypass cron authorization; use a separate
forward-only corrective migration when database remediation is required.
