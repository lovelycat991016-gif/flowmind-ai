# RAG Evaluation Report

## Provider

- Provider:
- Model:
- Dimension: `1536`
- Environment: Preview
- Validation date:

## Dataset

- Meeting count:
- Chunk count:
- Dataset types: product planning, technical review, launch risk, project management

## Queries

| Question | Expected source | Retrieved source | Citation source | Result |
| --- | --- | --- | --- | --- |
| Previous product priority | Product planning | | | |
| Why asynchronous workflow | Technical review | | | |
| Largest launch risk | Launch risk | | | |
| Owner of launch-risk action | Project management | | | |
| Company annual profit | Empty retrieval | | | |

## Metrics

- Retrieval Hit Rate:
- Source Accuracy:
- Citation Correctness:
- Empty Retrieval:
- Fallback Success:

## Reindex Audit

- Allowed owner:
- Batch size:
- Processed:
- Succeeded:
- Failed:
- Safe failure codes:
- Final cursor:

## Cutover Decision

- [ ] Real provider and approved model verified.
- [ ] Every selected chunk reindexed with the same model.
- [ ] No Mock vector is exposed to semantic retrieval.
- [ ] Relevant queries hit expected sources.
- [ ] Empty and failure fallback do not fabricate sources.
- [ ] Approved for production cutover.
