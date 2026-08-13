# Sprint 18 Production Migration Reconciliation Report

## Scope

This is a read-only reconciliation audit performed on 2026-07-30. It compares
the repository migration history with the currently linked remote Supabase
project. It does not run `supabase db push`, `supabase migration repair`, SQL,
or any other Production write.

## Evidence

The following read-only command completed successfully against the linked
remote project:

```powershell
supabase.cmd migration list
```

The CLI reported matching Local and Remote versions from `202607140001` through
`202607260001`. The remote history is a contiguous, ordered prefix of the
local history. No remote-only version, gap, reordering, or divergent version
was reported.

The CLI also reported version `2.108.0` and suggested `2.110.0`; this is not a
migration-history discrepancy. Do not change the CLI version during the
Production migration window without separate approval.

## Local Inventory

There are 21 ordered local migration files:

| Range                                 | Count | State in linked remote |
| ------------------------------------- | ----: | ---------------------- |
| `202607140001` through `202607260001` |    14 | Applied and matched    |
| `202607270001` through `202607280005` |     7 | Pending remotely       |

## Pending Forward Migrations

Apply the following files only in this exact version order after the target
project, backup/change controls, and release window are approved.

| Version        | File                                           | Main change                                                                                                                    | Required earlier objects                                                                                                                                          |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `202607270001` | `add_meeting_ai_messages.sql`                  | Adds Copilot message role/type, message table, owner RLS, grants, index, and update trigger.                                   | `meetings`, `set_updated_at()`                                                                                                                                    |
| `202607270002` | `add_action_items.sql`                         | Adds action-item enums/table, owner RLS, grants, indexes, and update trigger.                                                  | `meetings`, `meeting_intelligence`, `set_updated_at()`                                                                                                            |
| `202607280001` | `extend_ai_usage_events.sql`                   | Extends AI usage events for Copilot source, latency, constraints, policy, and index.                                           | `ai_usage_events`, `meetings`, `meeting_intelligence`                                                                                                             |
| `202607280002` | `create_meeting_knowledge_base.sql`            | Enables `vector`; adds knowledge job/status type and chunk tables including `vector(1536)`, RLS, grants, indexes, and trigger. | `meetings`, `transcripts`, `set_updated_at()`                                                                                                                     |
| `202607280003` | `add_meeting_knowledge_job_leases.sql`         | Adds knowledge-job lease columns and atomic service-role claim RPC.                                                            | `meeting_knowledge_jobs`                                                                                                                                          |
| `202607280004` | `create_knowledge_job_after_transcription.sql` | Replaces transcription completion RPC so a completed transcript idempotently queues one knowledge job.                         | transcription completion RPC, `processing_jobs`, `recordings`, `meetings`, `transcripts`, `transcript_segments`, `meeting_intelligence`, `meeting_knowledge_jobs` |
| `202607280005` | `add_vector_retrieval_rpc.sql`                 | Adds HNSW cosine index and authenticated vector match RPC, scoped by `auth.uid()` and limited to 1-20 rows.                    | `meeting_document_chunks`, `vector` extension                                                                                                                     |

## Dependency And Order Assessment

The pending sequence is valid as written:

1. Copilot messages and action items introduce independent product tables.
2. Usage-event extension changes the table created by `202607210003`.
3. The knowledge-base migration creates the tables, types, and `vector(1536)`
   column required by every later knowledge migration.
4. Lease handling extends the knowledge job table.
5. The transcription completion RPC is replaced only after the knowledge job
   table exists; its `ON CONFLICT (transcript_id) DO NOTHING` uses the unique
   constraint created in `202607280002`.
6. The HNSW index and match RPC are last, after the vector column exists.

No pending migration depends on a later file. The remote's existing
`202607260001` transcription RPC is intentionally superseded by the `CREATE OR
REPLACE FUNCTION` in `202607280004`; this is a normal forward change, not a
history divergence.

## Execution And Duplicate-Application Risks

Supabase migration tracking prevents a normally applied version from running
again. The SQL files themselves are mostly create/alter statements rather than
general-purpose re-runnable seed scripts, so manual execution outside the
migration system could fail on already-created types, tables, policies,
indexes, or triggers.

Specific operational risks to review before approval:

- `202607280002` requires the target project to permit the `vector` extension
  and creating a `vector(1536)` column.
- `202607280005` builds an HNSW index. Its duration and resource impact scale
  with existing chunk rows; schedule it in the approved change window and
  observe database capacity.
- `202607280004` changes the completion RPC used by transcription workers.
  Deploy application worker code and migrations as the same approved release;
  do not invoke the newer worker against the older database contract.
- RLS policies, function grants, and service-role behavior should be validated
  with non-sensitive owner-isolation smoke tests after the forward deployment.
- Migration history proves only recorded versions. It does not prove that no
  out-of-band schema changes were made in Production. An operator should
  inspect the target schema/change history before execution.

## Repair Assessment

**Recommendation: do not run `supabase migration repair`.**

Repair is not indicated by the observed history: remote is a clean prefix and
the seven local-only versions are contiguous forward migrations. Running repair
now could incorrectly mark an unapplied migration as applied, leaving required
tables, policies, functions, or indexes absent while hiding the mismatch from
the CLI.

Re-evaluate repair only if a separately approved schema investigation finds a
version recorded remotely whose intended schema change was applied manually or
if an unexpected version appears in the target project's history. That decision
requires an exact object-level comparison and a documented remediation plan.

## Release Recommendation

Current status is **NO-GO for Production deployment** because the seven
migrations are pending. The safe next action, after explicit approval and a
confirmed Production project reference, is:

```powershell
supabase db push --project-ref <approved-production-project-ref>
```

Immediately afterward, run a read-only parity check:

```powershell
supabase migration list --project-ref <approved-production-project-ref>
```

Require all 21 versions to match before releasing the features depending on
Copilot messages, action items, AI usage extension, knowledge jobs/chunks, or
vector retrieval. This report does not authorize or perform either command.
