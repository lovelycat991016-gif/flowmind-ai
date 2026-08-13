# Sprint 14 Meeting Knowledge Base / RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an owner-isolated historical meeting knowledge base and use retrieved, cited context in Meeting Copilot.

**Architecture:** Separate knowledge indexing jobs from existing workers. Store deterministic transcript chunks and vectors in Supabase, retrieve only same-owner chunks, and compose them into the existing Copilot provider boundary.

**Tech Stack:** Next.js App Router, Supabase Postgres/RLS/pgvector, server actions, service-role worker client, Zod, Vitest, provider factories.

---

## File structure

- `src/entities/meeting-knowledge/*`: job/chunk types and status transitions.
- `src/features/meeting-knowledge/chunking/*`: deterministic segment-aware chunker.
- `src/features/embedding-providers/*`: provider-neutral embedding contracts and factory.
- `src/features/meeting-knowledge/worker/*`: claim, indexing, and safe persistence.
- `src/features/meeting-knowledge/queries/*`: authenticated retrieval and source mapping.
- `src/features/meeting-copilot/context/*`: retrieved-context composition only.

### Task 1: Database contract and knowledge model

- [ ] Write migration contract tests for `meeting_knowledge_jobs`, `meeting_document_chunks`, pgvector, indexes, owner RLS, and a service-role-only claim RPC; run and confirm red.
- [ ] Add `202607280002_create_meeting_knowledge_base.sql` with the proposed tables, constraints, policies, grants, and `claim_next_meeting_knowledge_job` RPC. Do not change existing tables.
- [ ] Add domain status/types and Zod validation tests; implement only enough to pass.
- [ ] Run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: add meeting knowledge base schema`.

### Task 2: Chunk and embedding pipeline

- [ ] Write failing tests for 1,200/200 chunk overlap, segment metadata, content hash idempotency, provider batch mapping, missing key, timeout, and malformed vector rejection.
- [ ] Implement `EmbeddingProvider`, DeepSeek/OpenAI reserved adapters, deterministic mock, factory, and server-only environment parser.
- [ ] Implement lease-protected indexing worker: load owner-scoped transcript, chunk, embed, persist, and write only safe failure codes.
- [ ] Run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: index transcript knowledge chunks`.

### Task 3: Owner-scoped RAG retrieval service

- [ ] Write failing tests for cosine-ranked matching chunks, threshold/top-six limit, empty knowledge base, cross-user hiding, malformed vectors, and source labels.
- [ ] Implement authenticated question embedding and owner-filtered vector retrieval RPC/query; return bounded content plus meeting/date/time citations.
- [ ] Run focused tests, lint, typecheck, and diff check.
- [ ] Commit: `feat: add meeting knowledge retrieval`.

### Task 4: Copilot knowledge-base integration

- [ ] Write failing action/provider tests proving retrieval is invoked after meeting ownership validation, historical sources are included, empty retrieval is explicit, and provider/retrieval failures retain user-message history without exposing errors.
- [ ] Extend the existing Copilot context builder and prompt manager with a bounded `历史会议来源` section. Keep current-meeting context and existing provider abstraction unchanged.
- [ ] Run focused tests, lint, typecheck, full tests, build, and diff check.
- [ ] Commit: `feat: ground meeting copilot in knowledge base`.

### Task 5: Experience and operations polish

- [ ] Write failing UI/query tests for no indexed knowledge, indexing/pending state, cited-answer accessibility, and failed indexing safe status.
- [ ] Add minimal meeting-detail status/source presentation without new routes or analytics. Document configuration, production pgvector checks, re-index operations, deletion behavior, and known cost/latency limits.
- [ ] Run `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.
- [ ] Commit: `docs: complete sprint 14 knowledge base verification`.

## Verification and rollback

Every task starts with a focused failing test and uses injected provider transport only. Rollback disables retrieval through configuration and leaves current-meeting Copilot behavior intact; no historical content is sent when the embedding provider is unavailable. Migrations are additive; deletion cascades from transcripts/meetings remove their private chunks and jobs.

