# Sprint 15 Real AI Provider Design

## Goal

Enable FlowMind's existing server-side AI boundaries for private beta with
DeepSeek Chat as the default chat and structured-output provider. Select and
validate a production embedding provider without weakening the owner-scoped
Knowledge Base, RAG, worker, authentication, or RLS boundaries.

## Scope boundary

Sprint 15 is a provider activation and verification sprint. It may change
server-only provider adapters, factories, environment validation, safe failure
mapping, usage-event instrumentation, prompts, and tests. It does not add
product features, routes, dashboard metrics, billing, quotas, client-side AI
calls, database migrations, RLS changes, or changes to meeting, transcript,
recording, intelligence, processing-job, or knowledge-job lifecycles.

The existing paths remain intact:

```text
Meeting Intelligence: claimed job -> AIProvider -> Zod validation -> result
Meeting Copilot: authenticated action -> current/RAG context -> AIProvider -> message
Knowledge retrieval: question -> EmbeddingProvider -> vector RPC -> chunks
```

Only provider selection and provider-safe operational behavior change.

## Current architecture

`AIProvider` already exposes `generateStructuredOutput` and
`generateTextResponse`. `createAIProviderFromEnvironment()` selects DeepSeek,
OpenAI, or Mock; `DeepSeekProvider` uses the server-side Chat Completions API.
Meeting Intelligence and Meeting Copilot adapt that interface and retain their
current result and message boundaries.

`EmbeddingProvider` is separate from `AIProvider`, uses a fixed
`EMBEDDING_DIMENSIONS = 1536`, and currently returns `MockEmbeddingProvider`.
Knowledge chunks are stored as `vector(1536)`, and RAG retrieval is an
authenticated owner-filtered RPC. The embedding provider and model must
therefore produce exactly 1536 finite values; a new dimension requires an
explicit future migration, never a runtime setting.

AI usage events already record operation, owner, provider, model, outcome,
safe failure code, and latency. They intentionally do not record API keys,
prompts, transcript content, raw provider payloads, or full responses.

## Provider design

### DeepSeek Chat

`AI_PROVIDER=deepseek` selects `DeepSeekProvider` for Meeting Intelligence
and Meeting Copilot. It is instantiated only from server modules. Structured
Meeting Intelligence output continues to request JSON and is validated by the
existing Zod schema; Copilot continues to use the text-response prompt
boundary.

The adapter maps failures only to the current safe vocabulary:

- `rate_limited` for HTTP 429.
- `timeout` for abort, HTTP 408, and HTTP 504.
- `unavailable` for HTTP 5xx.
- `rejected_input` for size or validation failures.
- `malformed_output` for invalid/empty payloads or structured JSON.
- `request_failed` for remaining transport/provider failures.

No raw DeepSeek error, request body, API key, prompt, transcript, or response
is returned to UI, stored in a job error field, or written to logs.

### Embedding decision gate

Sprint 15 must not assume a DeepSeek embedding endpoint exists, is enabled for
the beta account, or emits 1536 dimensions. A controlled, synthetic-input
evaluation first verifies its official contract, model availability, regional
availability, batch limits, latency, rate limits, and output dimension.

The production decision is explicit:

1. Select `DeepSeekEmbeddingProvider` only if the official API is stable,
   server-side, and returns exactly 1536 dimensions.
2. Otherwise select `OpenAIEmbeddingProvider` with an explicitly configured
   1536-dimension model. Chat remains DeepSeek; embedding selection is
   independent.
3. Retain `MockEmbeddingProvider` for tests, local development, and an
   explicit safe fallback. Never silently mix embeddings from models or
   dimensions.

The factory owns vendor selection. Workers and retrieval retain their
provider-neutral interfaces.

## Environment variables

All values are server-only deployment secrets. None may begin with
`NEXT_PUBLIC_`, be passed to client components, or be logged.

| Variable | Required when | Value / default |
| --- | --- | --- |
| `AI_PROVIDER` | production chat | `deepseek`; `mock` only for local/test fallback |
| `DEEPSEEK_API_KEY` | DeepSeek chat or embedding | non-empty server secret |
| `DEEPSEEK_MODEL` | DeepSeek chat | `deepseek-chat` when omitted |
| `EMBEDDING_PROVIDER` | real RAG indexing/retrieval | approved `deepseek` or `openai`; `mock` for local/test |
| `EMBEDDING_MODEL` | real embeddings | explicit model producing 1536 dimensions |
| `OPENAI_API_KEY` | `EMBEDDING_PROVIDER=openai` | non-empty server secret |

`AI_PROVIDER` and `EMBEDDING_PROVIDER` stay independent. A missing required
secret is a safe configuration failure. An unknown provider records a
diagnostic-safe event and may select mock only where the existing factory
policy allows it; production validation must reject that configuration before
beta traffic is enabled.

## Failure handling and rollback

Provider calls use bounded timeouts and a single safe error classification.
Meeting Intelligence retains its current failed/retryable state. Copilot
persists the user message, returns a localized safe error, and retains message
history. Knowledge indexing records a safe failure code on its existing job;
request-time RAG failure returns `retrieved_chunks: []`, allowing Copilot to
continue with current-meeting context.

Rollback is configuration-first: `AI_PROVIDER=mock` disables real chat and
`EMBEDDING_PROVIDER=mock` disables live query embeddings. Do not change
database rows or alter RLS during rollback. Existing vectors remain queryable
only under the approved compatible model; changing provider/model requires a
separately approved re-index plan.

## AI usage-event verification

Every real provider operation retains an owner-linked usage event with
provider, model identifier, feature/operation, completed or failed outcome,
safe failure code, and latency. Event writes remain best-effort and cannot
change the AI operation's user-visible result. Sprint 15 verifies that
Intelligence and Copilot success/failure events contain no content-bearing or
credential-bearing fields and remain owner-readable through existing RLS.

## RAG quality verification

Use a synthetic Chinese-language evaluation fixture with known meeting dates,
decisions, owners, risks, and deliberately similar but irrelevant passages.
Evaluate direct fact lookup, cross-meeting topic recall, action owner/deadline
lookup, ambiguous wording, no-match questions, and cross-user isolation.

Record chunk identifiers, similarity rank, source labels, and human
relevance/grounding judgement in a local QA artifact. Do not record private
beta transcript text. Acceptance requires same-owner relevant sources in the
configured top-k for the fixture, no cross-user result, explicit uncertainty
when evidence is absent, and working Copilot behavior with empty or failed
retrieval.

## Testing and acceptance criteria

Tests cover environment parsing, factory selection, transport mapping,
timeouts, structured JSON/Zod rejection, prompt/context preservation, usage
event metadata, embedding dimension validation, RAG fallback, and owner
isolation. Deployment verification confirms secrets are server-runtime only
and absent from the browser bundle.

Sprint 15 is accepted when DeepSeek Chat safely services Intelligence and
Copilot in controlled beta; one approved 1536-dimension embedding provider
indexes and retrieves synthetic fixtures; failures are safe and retryable;
usage events are owner-linked and redacted; and mock-provider rollback is
documented and tested.
