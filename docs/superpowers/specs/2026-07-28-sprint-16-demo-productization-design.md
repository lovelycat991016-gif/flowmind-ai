# Sprint 16 Demo Productization Design

## Goal

Turn the existing FlowMind AI MVP into a stable, repeatable demonstration
environment for product walkthroughs, interviews, and automated Preview QA.
Sprint 16 improves presentation and verification, not the underlying AI,
security, database, or worker architecture.

## Fixed boundaries

Sprint 16 must preserve the existing AIProvider and EmbeddingProvider
interfaces, DeepSeek Chat provider, RLS policies, database contracts, vector
retrieval RPC, and worker lifecycles. It must not add a production migration,
change `vector(1536)`, alter authentication, or enable a real embedding
provider.

All fixture data is synthetic Chinese-language content. It must never be run
against the Production Supabase project, use production credentials, or be
included in production migrations.

## Demo narrative

The walkthrough starts on a dashboard showing three related meetings:

1. Product planning: scope, success measures, and owners.
2. Technical review: implementation decision, dependencies, and trade-offs.
3. Risk discussion: schedule and rollout risks with mitigations.

Each meeting has a fixed UUID, timestamp, transcript, transcript segments,
Meeting Intelligence result, action items, risks, and knowledge chunks. The
fixture manifest defines expected Copilot questions and sources, so the same
walkthrough can be verified automatically.

## Controlled Fixture Runner

Create a developer-only runner for `local` and explicitly approved Preview
environments. It performs three commands:

- `seed`: provisions or finds the dedicated demo user and upserts the complete
  synthetic fixture graph.
- `reset`: deletes only rows belonging to the dedicated demo user, in
  dependency-safe order.
- `verify`: checks fixture IDs, expected source data, and RLS-visible reads as
  the demo user without mutating data.

The runner has an environment guard that rejects `VERCEL_ENV=production`, a
production Supabase URL/project reference, missing explicit opt-in, or a Demo
user identifier outside the configured fixture namespace. It never receives a
production credential.

Existing schema grants may require service-role writes for intelligence,
knowledge chunks, and other worker-owned records. In that case, the runner may
use a local/Preview service-role client only during seed/reset. It must not
disable RLS, alter policies, or impersonate arbitrary users. Every inserted row
has the dedicated demo user's `user_id`; `verify` then uses an authenticated
demo-user client to prove owner-scoped visibility. This follows the same
privileged-write boundary already used by existing workers while retaining RLS
as the user-facing access control.

## RAG demonstration states

### State A: Indexed knowledge

The fixture writes deterministic 1536-dimensional mock vectors compatible with
the existing vector contract and includes known chunks across the three
meetings. A cross-meeting Copilot question retrieves the expected chunks.

The Copilot result UI displays a compact Sources section with:

- meeting name and meeting date;
- a bounded source chunk excerpt;
- similarity/relevance only when it is meaningful to the UI; and
- a link to the owner-accessible meeting detail page.

Sources are presentation metadata, not model claims. The UI renders only the
chunks returned by the owner-scoped retrieval path and never exposes vectors or
internal IDs.

### State B: Knowledge unavailable

The runner supports a no-index fixture mode that leaves embeddings absent while
retaining the same meetings and current-meeting intelligence. Retrieval returns
no chunks. The Copilot shows a clear knowledge-base-unavailable state, renders
no source list, and continues with current-meeting context. It must not invent
historical sources or claim that no historical information exists.

## Copilot experience and streaming

Sprint 16 adds visible but bounded demo polish: suggested question chips from
the fixture, explicit loading and safe error states, a source citation region,
and a knowledge availability indicator. These remain useful for ordinary
meetings; fixture-only labels are never shown to users.

Streaming is planned behind the existing server-only provider abstraction. The
first implementation must add a response transport that streams text chunks,
handles cancellation and safe terminal failure, and persists only the final
assistant message. It must keep the current non-streaming action as a
compatibility fallback until DeepSeek streaming and deployment behavior pass
Preview QA. No client receives an API key or directly calls a provider.

## Production and Preview deployment

Preview is the acceptance target for the fixture runner. The deployment guide
separates Preview demo variables from Production variables and documents an
explicit `DEMO_FIXTURES_ENABLED` gate that is forbidden in Production. DeepSeek
Chat remains server-only. Embedding stays Mock for local/Preview demo unless a
future approved, real 1536-dimension provider is configured.

No production deployment may claim semantic historical RAG when only Mock
embeddings are configured. The demo can show deterministic retrieval quality;
production RAG remains gated by the previously documented real-embedding
decision.

## Tasks and commit boundaries

1. Fixture manifest, environment guards, and runner contracts.
   Commit: `feat: add repeatable demo fixtures`.
2. RLS-visible fixture verification and automated Demo data QA.
   Commit: `test: verify demo fixture isolation`.
3. Copilot knowledge availability and source-citation presentation.
   Commit: `feat: show copilot knowledge sources`.
4. Streaming response transport with non-streaming compatibility fallback.
   Commit: `feat: stream meeting copilot responses`.
5. Preview deployment runbook, scripted QA walkthrough, and release gate.
   Commit: `docs: complete sprint 16 demo release verification`.

## Test strategy

Tests use fixture data and injected provider/retrieval transports only. They
cover deterministic seed/reset idempotency, production guard rejection,
dedicated-owner row assignment, RLS-visible reads, expected State A sources,
State B no-source behavior, citation rendering, streaming chunk ordering,
cancellation, safe failure, and non-streaming fallback. Tests must not use
network access, a production URL, or real API keys.

## QA acceptance criteria

A release candidate is accepted when a new local or Preview environment can
seed the three-meeting fixture twice without duplicates, reset only its Demo
user data, and verify owner-scoped reads. State A must display the expected
historical sources for the scripted questions. State B must retain current
meeting answers without sources. Copilot must expose loading, streaming, error,
and completion states accessibly. Preview deployment, secret boundaries,
rollback, and the full automated test/build suite must be recorded in the QA
runbook.

## Rollback

Rollback is configuration and deployment based: disable the fixture runner,
remove Preview demo environment variables, and redeploy the previous build.
For Copilot streaming, use the existing non-streaming response path. Reset the
dedicated Demo user only in local/Preview. Do not delete production data, alter
RLS, or run fixture commands in Production.
