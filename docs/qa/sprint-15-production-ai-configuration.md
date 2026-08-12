# Sprint 15 Production AI Configuration

## Purpose

This runbook records the private-beta configuration for FlowMind server-side
Chat and embedding providers. Set production secrets only in the Vercel
Production environment. Record verification status and a redacted incident
reference in release evidence; never record a key, prompt, transcript, audio
content, raw provider response, or customer data in this document.

## Required server configuration

Configure the Chat provider with the following values. Replace the key value
only in Vercel Project Settings; it must not be copied into source control.

```text
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<server-only-secret>
DEEPSEEK_MODEL=deepseek-chat
```

DeepSeek Chat supports production use with the configuration above.

## Embedding configuration

FlowMind currently does not configure a real production embedding provider.
DeepSeek does not currently support embeddings through a verified production
API contract compatible with this application. The default development and test
configuration is the deterministic, no-network MockEmbeddingProvider:

```text
EMBEDDING_PROVIDER=mock
```

Mock embedding is only for development and test. It is not a semantic RAG
solution, and production RAG requires a real embedding provider with a separately
approved server-only `EMBEDDING_API_KEY` and `EMBEDDING_MODEL`, returning
exactly 1536 finite values because `meeting_document_chunks.embedding` is
`vector(1536)`.

The current OpenAI-compatible adapter can be enabled only after Preview
validation with an approved 1536-dimension model:

```text
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=<approved-1536-dimension-model>
EMBEDDING_API_KEY=<server-only-secret>
```

Set these values only in Vercel Project Settings. Before production cutover,
re-index existing Mock vectors with the same approved model used for query
embeddings; Mock and real embeddings must not be mixed in semantic retrieval.

`AI_PROVIDER` and `EMBEDDING_PROVIDER` have independent lifecycles. Do not set
`EMBEDDING_PROVIDER=deepseek` until a verified DeepSeek embedding adapter and
1536-dimension compatibility plan have been approved. A change to the embedding
model or dimension needs a separately approved compatibility and re-index plan.

## Secret boundary

`DEEPSEEK_API_KEY` and `EMBEDDING_API_KEY` must not use a `NEXT_PUBLIC_`
prefix. They must not be returned by server actions, rendered in client
components, added to browser configuration, included in client or server logs,
or committed to `.env.example`, tests, documentation, or source files.

Configuration validation emits only these generic errors:

- `AI provider configuration is invalid.`
- `Embedding provider configuration is invalid.`

The error text must not identify a missing key, include its value, or reveal a
provider response. An unknown Chat provider selects the existing mock fallback
with a safe diagnostic reason. An explicitly configured unknown or unsupported
embedding provider, including `deepseek`, must fail safely with the generic
embedding configuration error. It must not silently select MockEmbeddingProvider.

## Usage Event and logging boundary

Usage Event rows may contain owner association, meeting association, operation
type, provider, model identifier, completed or failed outcome, safe failure
code, attempt number, and latency. They must not contain a prompt, transcript,
audio content, API key, raw provider payload, raw provider error, or full AI
response.

Server observability accepts only its structured category, operation, outcome,
safe failure code, correlation ID, and bounded duration fields. Do not add
provider request bodies or credential-bearing metadata to an observability
event.

## Pre-release checklist

1. Confirm the three DeepSeek Chat variables are configured only in Vercel
   Production settings.
2. Confirm no `NEXT_PUBLIC_DEEPSEEK_API_KEY` or
   `NEXT_PUBLIC_EMBEDDING_API_KEY` variable exists in Vercel or source control.
3. Confirm Chat uses DeepSeek. Confirm `EMBEDDING_PROVIDER=mock` is used only
   for development and test, and do not claim production semantic RAG is enabled.
4. Before enabling production RAG, approve and configure a real 1536-dimension
   embedding provider with server-only `EMBEDDING_API_KEY` and `EMBEDDING_MODEL`.
5. Simulate a missing key, HTTP failure, and timeout in automated tests. Verify
   that UI/job state receives only a safe failure code or message.
6. Inspect a synthetic success and failure Usage Event. Verify sensitive input,
   raw provider data, and keys are absent.
7. Verify `AI_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock` restore the
   non-network local/test fallback before emergency rollback is needed.

## Rollback

To stop external provider calls without database or RLS changes, set
`AI_PROVIDER=mock` and `EMBEDDING_PROVIDER=mock`, then redeploy. Existing
meeting, transcript, knowledge, and RAG security boundaries remain unchanged.
