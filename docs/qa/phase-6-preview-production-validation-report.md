# Phase 6 Preview Production Validation Report

Date: 2026-08-13

## Scope

This report validates the Preview readiness of the real embedding-provider
configuration without changing the schema, Workers, retrieval RPC, Copilot
contract, RLS, or application behavior. It separates repository contract
evidence from Preview runtime evidence that must be collected in Vercel.

## Result

**Ready for controlled Preview validation, not yet validated in a real Preview
deployment.**

The repository has the required safety gates for an owner-scoped, explicit
reindex. The local environment deliberately does not contain the Preview
secrets, allowlist, or `VERCEL_ENV=preview`; no provider request, database
write, reindex, or RAG query was executed during this review.

## 1. Environment Configuration

The real-provider configuration is accepted only when all of the following
server-side Preview variables are configured:

```text
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=<approved 1536-dimension model>
EMBEDDING_API_KEY=<server-only secret>
EMBEDDING_REINDEX_ALLOWED_OWNERS=<comma-separated Preview owner UUIDs>
```

`EMBEDDING_PROVIDER` defaults to `mock` only when it is absent. An explicit
`openai` selection without either model or key fails closed. Explicit DeepSeek
or unknown embedding selections also fail closed.

Local configuration observation (names only, never values): the local project
has public Supabase configuration, but does not have `VERCEL_ENV`, the four
real-embedding validation variables, or `SUPABASE_SERVICE_ROLE_KEY` set in the
current process. This prevents accidental local execution of the Preview-only
reindex command.

## 2. Provider Factory and Contract

`createEmbeddingProvider()` selects `OpenAIEmbeddingProvider` only for the
validated OpenAI configuration; otherwise it selects the deterministic Mock
provider or rejects invalid explicit configuration.

The OpenAI adapter:

- sends embedding requests only from server-imported code;
- sets `dimensions: 1536` and validates every returned finite vector;
- applies a 30-second abort timeout and honors a caller `AbortSignal`;
- maps timeout, rate limit, unavailable, rejected input, malformed output, and
  generic request failures to safe error codes;
- does not expose API keys through provider metadata or public environment
  variables.

## 3. Server-Only Secret Boundary

`EMBEDDING_API_KEY` is read from `process.env` inside server-side provider
configuration. No `NEXT_PUBLIC_EMBEDDING_API_KEY` reference exists in the
repository. The service-role client reads `SUPABASE_SERVICE_ROLE_KEY` through
the worker environment parser and is used by the developer-only reindex
dependency factory, not by client components.

The deployment contract also prohibits service-role and embedding API keys from
`.env.example`. Before Preview validation, confirm in Vercel Project Settings
that the four embedding variables are scoped to **Preview** only and that none
has a `NEXT_PUBLIC_` prefix.

## 4. Controlled Reindex Readiness

The explicit command is:

```text
npm run reindex:embeddings -- --owner=<preview-owner-uuid> --batch-size=50
```

It is safe to prepare, but must only be run after the following checks:

1. The Vercel Preview deployment has `VERCEL_ENV=preview`.
2. `<preview-owner-uuid>` is present in the nonempty
   `EMBEDDING_REINDEX_ALLOWED_OWNERS` allowlist.
3. The selected owner holds only isolated Preview/demo chunks.
4. The selected embedding model returns 1536-dimensional vectors.
5. The operator records `processed`, `succeeded`, `failed`, failure codes, and
   `nextCursor` for every batch.

The helper rejects non-Preview execution before loading data, requires an
allowlisted owner, bounds batch size to 1 through 100, uses stable
`transcript_id, chunk_index` cursor ordering, and limits embedding concurrency
to three. A failed chunk retains its existing embedding and is reported without
recording transcript contents or provider payloads. Updates are constrained by
chunk id, owner id, and chunk index.

Do not run this command against Production. Do not add Mock vectors after real
vectors are indexed for an evaluation owner.

## 5. RAG Evaluation Readiness

The Chinese evaluation fixture covers product planning, technical review,
launch risk, and project management queries. It verifies expected-source hit,
wrong-source rejection, citation provenance, and empty retrieval fallback.

For a real Preview run, use the report template in
`docs/qa/rag-evaluation-report-template.md` and record:

- provider, model, and dimension;
- owner, meeting count, and chunk count;
- query-level expected source and retrieved source;
- retrieval hit rate, source accuracy, and citation correctness;
- empty-retrieval and retrieval-failure fallback outcomes.

The Copilot path returns sources only for the current Server Action response.
Meeting metadata is loaded owner-scoped with only `id`, `title`, and
`meeting_date`. Missing metadata, empty retrieval, or retrieval failure yields
no sources and retains current-meeting-context fallback; it does not fabricate
citations.

## Required Preview Evidence Before Cutover

1. Screenshot or Vercel configuration evidence showing Preview-scoped variables
   exist without revealing secret values.
2. One successful 1536-dimensional real-provider embedding request.
3. Controlled reindex batch logs for a Preview allowlisted owner, including any
   retry cursor.
4. Completed RAG evaluation report with expected historical sources and correct
   Copilot citations.
5. Explicit empty-retrieval and simulated retrieval-failure screenshots proving
   no citation is shown and current-meeting fallback remains usable.

## Constraints and Remaining Risk

- This repository review cannot inspect Vercel secret values, Preview scope, or
  remote Supabase data; those require an authorized Preview operator.
- Mock and real vectors are semantically incompatible. Production semantic RAG
  must not be claimed until all intended real-provider chunks are reindexed and
  the evaluation report passes.
- The reindex helper is intentionally manual and owner-scoped. It is not a
  production migration, a Cron job, or a user-facing action.

## Decision

Proceed with the existing Preview validation runbook using a dedicated Preview
demo owner. Do not enable real embedding retrieval for broader environments
until the required Preview evidence is recorded and reviewed.
