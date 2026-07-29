# Sprint 16 Preview Demo QA Runbook

## Scope And Safety Gate

This runbook initializes only the dedicated synthetic Demo user for local or
Vercel Preview verification. It must not run in Production. Do not use a
Production Supabase URL, project reference, service-role key, or Demo user.
The commands reject `VERCEL_ENV=production`, an absent
`DEMO_FIXTURES_ENABLED=true` opt-in, an unscoped Demo email, and a target that
matches `FLOWMIND_PRODUCTION_SUPABASE_URL`.

Use a dedicated non-production user email such as
`demo.flowmind@example.test`. All fixture rows are synthetic Chinese meetings
and are owner-scoped to that user. The runner does not disable RLS or write to
production migrations.

## Preview Environment

Set these values only in the local or Vercel Preview environment. Server-only
values must never use a `NEXT_PUBLIC_` prefix, be returned to the browser, or
be copied into this runbook.

```text
VERCEL_ENV=preview
DEMO_FIXTURES_ENABLED=true
DEMO_FIXTURE_USER_EMAIL=demo.flowmind@example.test
NEXT_PUBLIC_SUPABASE_URL=<preview-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<preview-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<preview-server-only-key>
FLOWMIND_PRODUCTION_SUPABASE_URL=<production-supabase-url>

AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<preview-server-only-key>
DEEPSEEK_MODEL=deepseek-chat

EMBEDDING_PROVIDER=mock
```

DeepSeek Chat is server-only and available for the Preview demonstration. Mock
embedding is deterministic and is only appropriate for local/Preview demo
fixtures. It is not semantic production RAG. Do not claim production RAG is
enabled unless a separately approved real 1536-dimension embedding provider is
configured.

## Fixture Lifecycle

From the repository root, with only the environment above available:

```powershell
npm run demo:fixtures:seed
npm run demo:fixtures:verify
npm run demo:fixtures:reset
```

`seed` is idempotent and can be run again without duplicating the fixture
graph. `verify` is read-only: it confirms three fixture meetings, expected
knowledge-chunk sources, and dedicated-owner scope. `reset` removes only the
Demo user's fixture graph. After reset, run `verify` and expect it to fail;
run `seed` followed by `verify` to restore the Demo state.

Never run these commands with `VERCEL_ENV=production`. A production rejection
is expected and is a release safeguard, not an operational failure.

## RAG Demo Acceptance

### State A: Indexed fixture knowledge

1. Run `npm run demo:fixtures:seed` and `npm run demo:fixtures:verify`.
2. Sign in as the dedicated Demo user and open a fixture meeting.
3. Ask a historical question, for example: `之前会议讨论过哪些风险？`.
4. Confirm the Copilot answer is shown with a `知识库来源` region.
5. Confirm every citation has a meeting title, meeting date, and returned
   chunk excerpt. Do not infer or manually add citations.
6. Confirm a second non-Demo user cannot access the Demo user's meeting or
   sources.

### State B: Knowledge unavailable

1. Use a fixture without indexed chunks, or simulate an empty/retrieval-failed
   result through the existing automated test path.
2. Ask the same question.
3. Confirm the Copilot still returns an answer based on current meeting
   context.
4. Confirm `知识库当前不可用，已基于本次会议上下文回答。` is shown.
5. Confirm no `知识库来源` region, empty citation, fabricated meeting title,
   similarity, or source excerpt is rendered.

Sources exist only in the current Server Action response. Refreshing or
reopening the meeting displays persisted role/content messages without prior
sources.

## QA Checklist

- [ ] Preview uses a dedicated non-production Supabase project and Demo user.
- [ ] `DEMO_FIXTURES_ENABLED=true` is configured only for local/Preview.
- [ ] `VERCEL_ENV=production` rejects every fixture command.
- [ ] DeepSeek Chat variables are server-only and no `NEXT_PUBLIC_` provider
  key exists.
- [ ] `EMBEDDING_PROVIDER=mock` is recorded as a Demo-only boundary.
- [ ] Seed is idempotent; reset removes only the Demo owner's data; verify
  proves the restored graph and owner scope.
- [ ] State A renders only owner-scoped, returned source citations.
- [ ] State B presents the unavailable notice and no fabricated sources.
- [ ] A successful and failed Copilot request have Usage Events without keys,
  prompts, transcripts, raw provider errors, or complete meeting content.
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and
  `git diff --check` pass for the release candidate.

## Rollback

Disable `DEMO_FIXTURES_ENABLED`, remove Preview Demo environment values, and
redeploy the previous verified Preview build. Reset the dedicated Demo user
only after confirming the target is local/Preview. Do not delete production
data, modify RLS, change worker lifecycle, or run fixture commands in
Production.
