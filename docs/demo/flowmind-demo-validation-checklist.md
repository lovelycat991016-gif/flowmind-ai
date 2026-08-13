# FlowMind AI Demo Validation Checklist

Use this checklist in Preview with a dedicated demo owner. Fill `Actual Result`
and attach a screenshot or short recording link after each real validation. Do
not use fixture data or Mock embedding evidence to claim semantic production RAG.

| Step | Expected Behavior | Actual Result | Evidence Screenshot |
| --- | --- | --- | --- |
| 1. User login | Valid user reaches the authenticated dashboard; unauthenticated access redirects to login. | Pending | Pending |
| 2. Create Meeting | A new meeting is created and opens in meeting detail. | Pending | Pending |
| 3. Upload real audio | A supported recording uploads, can be cancelled during upload, and success refreshes meeting detail. | Pending | Pending |
| 4. View processing status | The meeting clearly shows queued, processing, completed, or failed state without a permanent loading state. | Pending | Pending |
| 5. View transcript | Completed transcription displays the owner-scoped transcript and segments. | Pending | Pending |
| 6. View AI Summary | Completed intelligence displays a structured summary. | Pending | Pending |
| 7. View Decisions | Meeting decisions are presented from validated structured output. | Pending | Pending |
| 8. View Risks | Meeting risks are presented from validated structured output. | Pending | Pending |
| 9. View Action Items | Action items are visible and actionable in the meeting detail. | Pending | Pending |
| 10. Query historical knowledge | Copilot accepts a question that depends on an indexed historical Preview meeting. | Pending | Pending |
| 11. View source citation | Sources show the retrieved meeting name, date, and relevant chunk excerpt for the current response only. | Pending | Pending |
| 12. Test knowledge-unavailable fallback | Empty knowledge or retrieval failure shows no fabricated source and Copilot keeps current-meeting-context fallback. | Pending | Pending |

## Evidence Notes

- Use synthetic Preview meetings and an allowlisted demo owner for reindex work.
- Redact emails, tokens, signed URLs, API keys, and any non-demo user content.
- Record the Preview deployment URL, commit hash, provider/model identifier, and
  validation date beside stored screenshots.
- For real semantic RAG evidence, complete the companion
  [embedding validation runbook](../qa/embedding-production-validation-runbook.md)
  and attach the completed RAG evaluation report.
