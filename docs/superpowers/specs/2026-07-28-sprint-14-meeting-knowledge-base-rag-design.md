# Sprint 14 Meeting Knowledge Base / RAG Design

## Goal and boundary

Give each user a private historical meeting knowledge base so Meeting Copilot can answer questions using relevant past transcripts, intelligence results, and cited sources. Sprint 14 adds chunking, embeddings, retrieval, and Copilot context composition only. It does not change authentication, middleware, existing meeting/transcript tables, RLS ownership semantics, Intelligence generation, payment, quotas, or client-side provider calls.

## Architecture and lifecycle

`transcript completed -> knowledge index job queued -> lease-protected worker claims -> load owner-scoped transcript -> deterministic chunks -> EmbeddingProvider -> document chunks + vectors -> completed`. A new `meeting_knowledge_jobs` table is deliberately separate from `processing_jobs` and `meeting_intelligence`: it has its own `queued -> running -> completed | failed | cancelled` lease lifecycle, retry metadata, and service-role claim RPC. Existing workers retain their current responsibilities and state machines.

At Copilot request time, the authenticated action preserves the current-meeting context, calls an owner-scoped retrieval service with the question, and adds a bounded set of historical chunks to the prompt. The response must cite the supplied source labels; absence of matches is explicit rather than inferred.

## Database proposal

Enable the Supabase `vector` extension if production supports it. Add:

- `meeting_knowledge_jobs`: `id`, `transcript_id` (unique active job), `meeting_id`, `user_id`, status, attempts, lease fields, safe failure code, timestamps. RLS permits owner SELECT only; service role owns mutations and claim RPC.
- `meeting_document_chunks`: `id`, `transcript_id`, `meeting_id`, `user_id`, `chunk_index`, `content`, `content_hash`, `start_ms`, `end_ms`, `speaker`, `embedding vector(1536)`, `embedding_provider`, `embedding_model`, timestamps. Unique `(transcript_id, chunk_index)`, owner/meeting indexes and vector similarity index. Owner RLS requires both `user_id = auth.uid()` and ownership of the related meeting.

No transcript, recording, meeting, or Intelligence column changes are required. Dimension `1536` is configuration-bound: changing embedding models/dimensions requires an explicit future migration, never a silent runtime switch.

## Provider boundary

Add `EmbeddingProvider` beside `AIProvider`, with `embed(input: { texts: string[] }): Promise<{ vectors: number[][]; metadata }>` and server-only factory selection. `DeepSeekEmbeddingProvider` and `OpenAIEmbeddingProvider` are adapters selected by configuration; `MockEmbeddingProvider` supports deterministic tests. Provider errors map only to safe codes. API keys, texts, vectors and raw responses are never logged or returned to clients.

## Chunk strategy

Start with deterministic transcript chunks of 1,200 Chinese characters, 200-character overlap, hard cap 2,000 characters, preserving segment boundaries where present. Store chunk order, time range, optional speaker, transcript/meeting/user identifiers, and a SHA-256 content hash. Re-indexing is idempotent: unchanged hash reuses a chunk; a transcript revision replaces its chunks only after its job owns the lease. The worker bounds batching to provider limits.

## Retrieval and security

Retrieval embeds the user question, calls an owner-filtered RPC/query for cosine similarity, takes at most 6 chunks above a configurable relevance threshold, and bounds total retrieved text. Every result has a source label with meeting title/date and transcript time range. Database filtering includes `user_id`; RLS remains the defense in depth boundary. The service returns an empty list for a missing/empty knowledge base and never reveals other users' similarity scores, chunks, or metadata.

## Testing and acceptance criteria

Tests cover migration/RLS contracts, chunk boundaries and overlap, hash idempotency, provider mapping/failures, lease claiming, owner-isolated retrieval, empty knowledge base, result ordering/thresholds, source citations, and Copilot safe fallback. Acceptance requires a completed transcript to produce owner-visible indexed chunks; historical questions retrieve only same-owner sources; failed embedding attempts are safe/retryable; and current-meeting Copilot behavior remains available when retrieval is empty or unavailable.

