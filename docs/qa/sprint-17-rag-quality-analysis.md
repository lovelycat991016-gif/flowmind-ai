# Sprint 17 RAG Quality Analysis

## Scope

This runbook defines an offline, synthetic RAG quality evaluation. It does not
change the production retrieval call, embedding provider, worker lifecycle,
database schema, migration history, vector dimension, or RPC contract.

## Evaluation Method

Each synthetic evaluation case contains a user query and the expected source
meeting IDs. The evaluator receives retrieved chunks containing only a source
meeting ID, synthetic content, and a similarity score. It applies an explicit
similarity threshold for evaluation, compares qualifying retrieved sources with
the expected sources, and classifies the result as:

| Classification | Meaning |
| --- | --- |
| `correct` | Every expected source is present and no unrelated source is present. |
| `incorrect` | At least one expected source is absent or an unrelated source is present. |
| `empty` | No source qualifies after filtering, so the evaluation falls back to current-meeting context. |

The evaluation result exposes source IDs and similarity values for inspection.
The aggregated report intentionally excludes the query, current context, and
chunk content.

## Metrics

The hit rate, empty retrieval rate, and similarity distribution are defined
below for the synthetic evaluation set.

| Metric | Definition |
| --- | --- |
| Hit rate | `correct` evaluations divided by all evaluations. |
| Empty retrieval rate | `empty` evaluations divided by all evaluations. |
| Similarity distribution | Count, minimum, maximum, rounded average, and fixed buckets for qualifying retrieved chunks. |

Similarity distribution buckets are `below050`, `from050To079`,
`from080To089`, and `atLeast090`. The average is rounded to four decimal places
to keep synthetic evaluation output deterministic.

## Similarity Threshold Design

`similarityThreshold` is an optional evaluation-only input. Its default is
`0`, preserving baseline synthetic cases and ensuring no production behavior is
silently changed. A recommended candidate threshold, such as `0.8`, must be
tested against the full synthetic set before adoption. A chunk below the
threshold does not become a cited source; if all chunks are below it, the case
uses the current-context fallback.

This threshold is not passed to `match_meeting_document_chunks`, does not
change the vector index, and does not modify the RPC contract. Any future
production threshold would require a separately approved retrieval behavior,
quality regression, and privacy review.

## Embedding Provider Boundary

Current evaluation uses synthetic chunks and the deterministic
`MockEmbeddingProvider` development/test boundary. It does not establish
semantic production RAG quality. Before claiming production semantic quality,
configure a reviewed real embedding provider that returns exactly 1536 finite
values, re-index data under a controlled plan, and rerun this evaluation with
representative owner-scoped fixtures.

## Privacy Boundary And Future Improvement

Do not persist or log a prompt, transcript, raw chunk content, embedding,
provider response, provider error, or API key in quality metrics. Use only
synthetic fixtures for repeatable automated evaluation. Future improvements may
add a broader fixture set, annotation review, provider-version comparison, and
offline precision/recall metrics. They must preserve owner isolation and remain
separate from production retrieval unless explicitly reviewed.
