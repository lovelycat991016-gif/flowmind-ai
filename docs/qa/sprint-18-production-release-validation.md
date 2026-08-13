# Sprint 18 Production Release Validation Record

## Scope

This validation record was started on 2026-07-30 after the reported Vercel
Production deployment. It records observed live-environment evidence only. No
application code, Vercel configuration, migration, provider, worker, or
Production data was modified.

## Release Decision

**NO-GO: Production target is not verified.**

The workspace has no Vercel project binding or confirmed Production URL. A
single focused check of the inferred default Vercel URL,
`https://flowmind-ai.vercel.app/`, reached a live page, but its visible product
does not match this FlowMind meeting-intelligence repository. It identifies
itself as **"FlowmindAi- AI Agent Flow Builder"** and presents a no-code AI
agent builder, rather than the meeting workspace, authentication routes, and
Copilot/RAG experience implemented here.

This is evidence that the tested URL must not be used as the FlowMind
Production validation target. It does not prove whether an intended custom
domain or another Vercel project deployment is healthy.

## Live Validation Results

| Check                          | Result                          | Evidence                                                                                                 |
| ------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Home page loads             | Blocked for FlowMind validation | The inferred URL returned HTTP-rendered content, but it was the unrelated AI Agent Flow Builder product. |
| 2. User authentication         | Not run                         | Stopped before interacting with an unverified target.                                                    |
| 3. Create meeting              | Not run                         | Stopped to avoid writing test data to an unrelated application.                                          |
| 4. Transcript pipeline         | Not run                         | Requires the verified FlowMind Production target and a non-sensitive test fixture.                       |
| 5. Knowledge job creation      | Not run                         | Requires the verified FlowMind Production target.                                                        |
| 6. Cron worker scheduling      | Not run                         | Requires verified target routes and authorized, redacted monitoring evidence.                            |
| 7. Knowledge chunk persistence | Not run                         | Requires the verified FlowMind Production target and approved test data.                                 |
| 8. Copilot DeepSeek call       | Not run                         | No request was sent to an unverified application.                                                        |
| 9. RAG source citation         | Not run                         | Requires the FlowMind Copilot UI and indexed non-sensitive fixture data.                                 |
| 10. Empty knowledge fallback   | Not run                         | Requires the FlowMind Copilot UI.                                                                        |
| 11. Owner isolation            | Not run                         | Requires two approved non-sensitive test accounts in the correct project.                                |

## Blocking Condition

Before resuming, the release operator must supply or confirm all of the
following without exposing credentials:

1. The exact Vercel Production deployment URL or custom domain for this
   repository.
2. The Vercel project that is linked to
   `lovelycat991016-gif/flowmind-ai` and its Production branch.
3. A non-sensitive test account/session for FlowMind Production, plus an
   approved second account for owner-isolation verification if browser testing
   is required.
4. An approved test workflow for creating, uploading, and processing
   non-sensitive meeting data.

## Resume Procedure

Once the exact target is confirmed, restart the validation from the home page.
Use only synthetic/non-sensitive data, record only statuses and safe error
classes, and do not print credentials, transcripts, provider payloads, or
service-role values. Validate owner isolation with controlled accounts before
recording a Production GO decision.
