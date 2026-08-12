# Preview Embedding Production Validation

## Scope

This runbook validates a real embedding provider in an isolated Preview
environment. It is a manual developer procedure, not a user flow, Cron, or
production reindex. Do not mix Mock and real vectors in semantic retrieval.

## Preview Configuration

Configure these server-only Preview values in Vercel Project Settings:

```text
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=<approved-1536-dimension-model>
EMBEDDING_API_KEY=<server-only-secret>
EMBEDDING_REINDEX_ALLOWED_OWNERS=<preview-demo-owner-uuid>
```

`EMBEDDING_API_KEY` must never use a `NEXT_PUBLIC_` prefix. The reindex command
also requires `VERCEL_ENV=preview`; it rejects missing or nonmatching owners.

## Validation Flow

```text
Provider initialization
  ↓
Embedding generation
  ↓
1536-dimension validation
  ↓
Controlled owner-scoped reindex
  ↓
Retrieval evaluation
  ↓
Copilot citation validation
```

1. Confirm the factory initializes the approved provider/model with no key in
   browser configuration or logs.
2. Run the provider contract suite. Confirm a synthetic Chinese input returns
   exactly 1536 finite values and that timeout, abort, malformed response, and
   wrong dimension return safe failures.
3. Set an explicit Preview owner allowlist and run one batch:

   ```text
   npm run reindex:embeddings -- --owner=<preview-owner-uuid> --batch-size=50
   ```

4. Record `processed`, `succeeded`, `failed`, safe failure codes, and
   `nextCursor`. Pass `nextCursor` to the next explicit batch.
5. Execute the Chinese RAG evaluation fixture. Confirm expected sources are
   retrieved, citations are derived from retrieval, and unrelated queries are
   empty.
6. Simulate embedding and retrieval failure. Confirm Copilot has no sources
   and falls back to current meeting context.

## Rollback

Do not restore or add Mock vectors after real vectors have been indexed. If
validation fails, disable historical RAG retrieval for the Preview environment
and retain the current-meeting-context fallback. Preserve existing chunks and
valid vectors; retry only failed owner-scoped batches after correcting provider
configuration or service availability.
