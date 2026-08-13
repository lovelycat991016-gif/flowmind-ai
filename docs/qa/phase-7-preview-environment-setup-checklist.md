# Phase 7 Task 1: Preview Environment Setup Checklist

Date: 2026-08-13

## Purpose and Scope

Prepare an isolated Vercel Preview environment for real embedding validation.
This is a setup checklist, not an instruction to change the schema, migration,
Worker, retrieval RPC, Copilot, RLS, or Cron. Do not run reindex against
Production and do not mix Mock and real embeddings for an evaluation owner.

## 1. Required Environment Variables

Configure these values in Vercel Project Settings with the **Preview** target.
Use real values only in Vercel; do not add secrets to `.env.example`, source
control, screenshots, browser configuration, or application logs.

| Variable | Required for | Target | Security classification |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Preview redirects and links | Preview | Browser-safe public configuration |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase browser/server connection | Preview | Browser-safe public configuration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase browser/server session client | Preview | Browser-safe public configuration |
| `AI_PROVIDER` | Existing chat/intelligence provider selection | Preview | Server configuration selector |
| `DEEPSEEK_MODEL` | Existing chat/intelligence model selection | Preview | Server configuration selector |
| `DEEPSEEK_API_KEY` | Existing chat/intelligence calls | Preview | Server-only secret |
| `EMBEDDING_PROVIDER=openai` | Real embedding selection | Preview | Server configuration selector |
| `EMBEDDING_MODEL` | Approved OpenAI model with 1536 output dimensions | Preview | Server configuration selector |
| `EMBEDDING_API_KEY` | Real embedding request authentication | Preview | Server-only secret |
| `EMBEDDING_REINDEX_ALLOWED_OWNERS` | Explicit Preview reindex authorization | Preview | Server-only access-control configuration |
| `SUPABASE_SERVICE_ROLE_KEY` | Developer-only reindex dependency and existing workers | Preview | Server-only secret |
| `CRON_SECRET` | Existing protected worker routes | Preview | Server-only secret |

Do not create `NEXT_PUBLIC_EMBEDDING_API_KEY`,
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEEPSEEK_API_KEY`, or
`NEXT_PUBLIC_CRON_SECRET`. The repository contains no such public key path.

## 2. Vercel Preview Preconditions

- Confirm the Vercel project is connected to the intended repository and that a
  non-production deployment is available.
- Confirm Vercel supplies `VERCEL_ENV=preview` to the Preview deployment. The
  reindex script rejects every other value before it loads data.
- Set the variables above only for Preview. Do not change Production settings
  for this validation task.
- Confirm the Preview URL uses HTTPS and maps `NEXT_PUBLIC_APP_URL` to that
  Preview deployment URL.
- Do not use a branch deployment linked to Production Supabase data. Use an
  isolated Preview Supabase project or an explicitly approved isolated dataset.

Remote Vercel project linkage, deployment target, and secret scopes cannot be
verified from this repository alone; an authorized Vercel operator must mark
these items complete.

## 3. Embedding Provider Chain

```text
EMBEDDING_PROVIDER=openai
  -> createEmbeddingProvider()
  -> OpenAIEmbeddingProvider
  -> validateEmbedding(vector(1536))
  -> Meeting Knowledge Worker / controlled reindex
  -> match_meeting_document_chunks RPC
  -> owner-scoped Copilot sources for the current response
```

Checklist:

- [ ] `EMBEDDING_PROVIDER` is exactly `openai` for the Preview validation.
- [ ] `EMBEDDING_MODEL` is explicitly set to an approved model that supports a
  1536-dimensional output. The adapter requests `dimensions: 1536` and rejects
  any malformed, non-finite, or incorrect-length result.
- [ ] `EMBEDDING_API_KEY` is present only as a Preview server secret.
- [ ] Missing, blank, or incomplete OpenAI configuration fails closed during
  provider creation rather than silently selecting an unintended real provider.
- [ ] Provider requests use a 30-second abort cap and honor a caller abort
  signal.
- [ ] The evaluation owner has no mixed Mock/real semantic corpus. Existing
  Mock vectors must not be reused as evidence of real semantic retrieval.

`mock` remains the default only when no provider is selected. This is suitable
for local/demo behavior but not evidence of production semantic RAG quality.

## 4. Controlled Reindex Conditions

The manual Preview-only command is:

```text
npm run reindex:embeddings -- --owner=<preview-owner-uuid> --batch-size=50
```

Before execution:

- [ ] Choose one dedicated Preview/demo owner UUID, never a real user owner.
- [ ] Set `EMBEDDING_REINDEX_ALLOWED_OWNERS` to an explicit comma-separated
  list containing that UUID. Empty, wildcard, missing, and nonmatching lists
  are rejected.
- [ ] Confirm `VERCEL_ENV=preview` in the execution environment.
- [ ] Start with `--batch-size=50`. Valid batch sizes are integers from 1 to
  100; no default broad scan exists without an explicit owner.
- [ ] Capture the JSON result: `processed`, `succeeded`, `failed`, safe failure
  codes, and `nextCursor`.
- [ ] To continue, pass the returned cursor explicitly:

  ```text
  npm run reindex:embeddings -- --owner=<preview-owner-uuid> --batch-size=50 --cursor=<nextCursor>
  ```

- [ ] Repeat only until the evaluation owner's intended chunks are processed.

Execution guarantees to verify:

- Stable pages are ordered by `transcript_id`, then `chunk_index`.
- Embedding concurrency is bounded at three.
- Each vector update is constrained by chunk id, owner id, and chunk index.
- A chunk failure leaves its previous vector unchanged and reports only a safe
  error code; it does not log transcript content or provider payloads.

The helper deliberately overwrites an existing vector only after a successful
real embedding response. Therefore it can replace Mock vectors for the chosen
isolated Preview owner, but it must not be used to create a mixed corpus. Do
not use it against Production.

## 5. Supabase Preview Requirements

### Connection and authentication

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point to
  the intended Preview Supabase project.
- [ ] Preview authentication works for the selected demo user, so the browser
  has an authenticated `auth.uid()` context for retrieval.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured only as a server secret. It is
  required by the explicit reindex dependency factory and existing protected
  worker paths, never by the browser.

### Database, RLS, and RPC

- [ ] The Preview database has the existing `meeting_document_chunks` table,
  `vector(1536)` embedding column, and HNSW index.
- [ ] The Preview database exposes the existing
  `match_meeting_document_chunks(vector(1536), integer, uuid)` RPC.
- [ ] The authenticated retrieval RPC remains owner-scoped by `auth.uid()` and
  only returns chunks with a non-null embedding.
- [ ] RLS remains enabled on knowledge jobs and chunks. Authenticated users have
  owner-scoped read access; service role is the only principal with mutation
  privileges required by the reindex helper.
- [ ] No schema, policy, RPC, or permission change is needed for this task.

### Storage

- [ ] The Preview project retains the existing recordings bucket and policies
  needed by the normal audio pipeline.
- [ ] Storage is not required to run reindex on existing chunks, but it is
  required for a full audio-to-knowledge end-to-end validation.
- [ ] Do not use Production recordings or storage objects as Preview evidence.

## 6. Validation Checklist

1. [ ] Record Preview deployment URL and commit identifier without secret values.
2. [ ] Confirm all required Preview variables exist with the correct scope.
3. [ ] Confirm no server-only variable uses a `NEXT_PUBLIC_` name.
4. [ ] Run the existing provider contract tests: configuration rejection,
   1536-dimensional success, malformed response, timeout, and abort behavior.
5. [ ] Run one allowlisted Preview reindex batch and preserve its sanitized JSON
   audit result.
6. [ ] Use `nextCursor` for subsequent explicit batches as needed.
7. [ ] Run the Chinese RAG evaluation fixture and complete
   `docs/qa/rag-evaluation-report-template.md` with real results.
8. [ ] In the Preview UI, ask a historical-meeting question and confirm the
   citation title, date, metadata, and snippet belong to the retrieved source.
9. [ ] Test empty retrieval and retrieval failure: current-meeting fallback must
   remain available and sources must be absent.
10. [ ] Attach configuration-safe screenshots and the completed evaluation report
    to the Phase 6/7 validation evidence.

## 7. Remaining Risks

- Repository tests prove contracts, not Vercel secret scopes, remote provider
  access, remote Supabase migration state, or real Chinese retrieval quality.
- OpenAI model access, quota, rate limiting, and network behavior must be
  verified in Preview with a non-sensitive fixture.
- Mock and real vectors are not semantically comparable. Broader RAG enablement
  requires every intended owner corpus to be reindexed with the same approved
  real model and then evaluated.
- The reindex helper is manual and batch-bounded; interruption recovery depends
  on recording and reusing `nextCursor`.
- Existing scheduled Knowledge Worker behavior is outside this task. Do not use
  it as a substitute for explicit controlled reindex evidence.

## Decision Gate

Proceed only when all Preview setup items, one controlled real-provider reindex
batch, and the completed RAG evaluation report are available. Otherwise retain
the current-meeting fallback and do not claim real semantic RAG readiness.
