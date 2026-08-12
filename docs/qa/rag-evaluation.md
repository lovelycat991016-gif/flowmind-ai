# RAG Evaluation

## Scope

This Preview-only evaluation validates real semantic retrieval after all selected
chunks have been re-indexed with one approved embedding provider and model. It
does not run against production users and does not mix Mock and real vectors.

## Dataset

The synthetic Chinese fixture covers four meetings: product planning, technical
review, launch risk, and project management. It contains four expected-source
questions: product priority, asynchronous architecture, launch risk, and the
owner of the launch-risk action item. A fifth unrelated query, `公司今年利润是多少？`,
must return empty knowledge.

## Run Record

Record only non-sensitive values:

| Field | Required value |
| --- | --- |
| Provider | `openai` or approved adapter identifier |
| Model | approved 1536-dimension model identifier |
| Dimension | `1536` |
| Indexed chunks | exact run count |
| Retrieval top-k | configured match count |
| Queries | 5 |
| Hit rate | expected source present / 4 relevant queries |
| Source accuracy | correct expected meeting / retrieved source count |
| Citation correctness | citations that originate from retrieval / citation count |
| Fallback behavior | empty and simulated provider/RPC failure return no sources and preserve current-meeting context |

## Acceptance

Production cutover requires all of the following:

1. The real provider, model, and 1536-dimensional response are verified in Preview.
2. All intended production chunks are re-indexed with that exact model.
3. No Mock vector remains exposed to semantic retrieval.
4. Relevant fixture questions hit their expected source; unrelated questions are empty.
5. Copilot citations originate from retrieval, while embedding or RPC failure falls back without fabricated sources.
6. Reindex failures leave the previous embedding unchanged and are retried with the same owner-scoped command.

## Controlled Command

Only set `VERCEL_ENV=preview` and an explicit comma-separated
`EMBEDDING_REINDEX_ALLOWED_OWNERS` allowlist. Then run one batch at a time:

```text
npm run reindex:embeddings -- --owner=<preview-owner-uuid> --batch-size=50
```

Pass the returned `nextCursor` to continue. The command is not a Cron, API
route, or user-facing workflow. It rejects production, an empty allowlist, and
owners outside the allowlist.
