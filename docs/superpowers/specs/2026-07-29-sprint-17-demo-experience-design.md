# Sprint 17 Task 4: AI Product Demo Experience Design

## Intent

Position FlowMind AI as an enterprise meeting knowledge product rather than a
recording utility. The public, unauthenticated landing page becomes a
narrative-led product introduction that carries a visitor from business value
to a tangible Demo journey. It does not change any meeting, AI, retrieval, or
security behavior.

## Chosen Direction

Use the selected narrative product-tour direction: a quiet, Apple-inspired
page with generous whitespace, restrained color, strong type hierarchy, and a
single product-surface preview. The hero leads with value before feature lists.
The existing green FlowMind design token remains the action color; no Apple
brand assets, copied UI, gradients, or decorative effects are used.

## Information Architecture

1. **Hero**: `FlowMind AI` is the primary visual signal. The headline is
   `让会议从记录工具变成可持续利用的知识资产。` Supporting copy explains that
   meetings become summaries, decisions, action items, and traceable knowledge.
   Primary command is `查看 Demo`; secondary command is registration.
2. **Product value**: three concise business outcomes: retain institutional
   knowledge, turn consensus into accountable work, and answer questions from
   historical meeting evidence. This is not a capability-card catalog.
3. **AI workflow**: a readable, linear workflow from meeting input through
   transcription/intelligence, knowledge indexing, and next action. This
   visualizes existing behavior without inventing a new pipeline.
4. **Demo case**: a static, clearly labeled synthetic meeting preview. It
   highlights Meeting Intelligence results, decisions, action items, risk, and
   the transition to a Copilot question.
5. **Copilot evidence**: show an example question, answer, and three source
   rows containing meeting title, date, and a short source excerpt. Sources are
   presentation-only examples and must not claim a similarity score.
6. **Architecture explanation**: three compact stages: AI Workflow, Knowledge
   Pipeline, Reliability Layer. Each stage describes an existing boundary in
   plain product language, never reveals a key, prompt, transcript, provider
   error, database table name, or internal RLS implementation.
7. **Final CTA**: repeat `查看 Demo` and registration. On mobile the content
   stays single-column, the preview scrolls naturally, and commands remain
   visible without horizontal overflow.

## Demo Navigation

`查看 Demo` scrolls to the Demo case section with an accessible landmark and a
stable fragment id. The case exposes three local anchor commands in order:

`会议智能分析` -> `向 Copilot 提问` -> `查看来源引用`.

They are navigation affordances only. They must not seed data, impersonate a
user, invoke an AI provider, call a worker, or alter persisted messages. The
existing signed-in dashboard and meeting routes remain unchanged.

## Component Boundaries

Keep `LandingPage` as the unauthenticated page composition. Create presentational
sections below `src/widgets/landing/ui/` for the value narrative, workflow,
Demo case, source preview, and architecture explanation. Define all new Chinese
copy under `zhCN.landing`; no content is hard-coded inside tests. Use existing
`buttonVariants`, Tailwind tokens, and Lucide icons. Avoid introducing client
state unless an interaction requires it; fragment links should remain plain
links.

## Safety And Privacy

Demo content is synthetic and static. It must not include customer meetings,
transcripts, raw chunks, embeddings, prompts, provider responses, API keys,
provider errors, user identifiers, or similarity values. Source presentation
uses fictional meeting names, dates, and short fabricated excerpts. This task
does not modify database schema, migration history, RLS, Provider contracts,
worker lifecycle, or the RAG retrieval contract.

## Acceptance Criteria

- The hero prioritizes the product value statement and offers `查看 Demo`.
- A visitor can follow the stated navigation from value to workflow, Demo
  Meeting Intelligence, Copilot question, and evidence sources.
- Product architecture shows the three named layers in accessible semantic
  markup.
- Links are ordinary navigation/fragment links; no Demo action produces a
  server mutation or AI call.
- Desktop and mobile layouts preserve hierarchy, readable line lengths, focus
  indicators, and no horizontal overflow.
- Tests cover page sections, Demo anchor navigation, and absence of sensitive
  language/data in the synthetic presentation copy.
