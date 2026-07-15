# FlowMind AI

FlowMind AI is a production-focused meeting assistant that will turn uploaded meeting audio into transcripts, summaries, and actionable follow-ups. Development is delivered in review-gated Sprints.

## Sprint 1

Sprint 1 establishes the application foundation and authentication boundary:

- Next.js 15 App Router with React and strict TypeScript
- Tailwind CSS and shadcn/ui-compatible primitives
- Supabase email/password authentication
- Sign-up, sign-in, sign-out, and password recovery
- Cookie-based server sessions and protected dashboard routing
- Automatic profile provisioning with owner-only row-level security
- Vitest, Testing Library, ESLint, Prettier, and GitHub Actions

Meeting management and dashboard product functionality are intentionally outside Sprint 1.

## Sprint 2

Sprint 2 adds the approved Calm Workspace dashboard experience:

- Responsive application shell with desktop sidebar, tablet icon rail, and mobile drawer
- Header with reserved search and notifications plus an accessible user menu
- Welcome banner, four statistics, recent meetings, quick actions, and processing empty state
- Typed, deterministic local mock data with no Supabase or API reads
- Reusable Card, Button, Badge, Skeleton, EmptyPlaceholder, and loading-state components
- Light and dark semantic design tokens for surfaces, status colors, shadows, and focus states
- Browser-validated desktop, tablet, and mobile layouts

Meeting CRUD, uploads, transcription, summaries, action item persistence, and all backend integration remain outside Sprint 2.

## Technology

- Next.js 15 and React 19
- TypeScript in strict mode
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Vitest and Testing Library
- Vercel deployment target

## Project Structure

```text
src/
|-- app/                         # App Router pages, layouts, loading states, and middleware entry
|-- entities/meeting/            # Meeting types and status presentation
|-- features/
|   |-- auth/                    # Authentication actions, policies, schemas, and UI
|   `-- dashboard/               # Dashboard composition and local mock adapter
|-- shared/
|   |-- config/                  # Validated public environment configuration
|   |-- lib/supabase/            # Browser, server, and middleware Supabase adapters
|   `-- ui/                      # Reusable shadcn-style UI primitives
`-- widgets/
    |-- app-shell/               # Responsive sidebar, header, drawer, and navigation model
    `-- dashboard/               # Welcome, statistics, meetings, and quick-action widgets
supabase/
`-- migrations/                 # PostgreSQL schema and RLS migrations
docs/
|-- qa/                          # Browser QA evidence and issue log
|-- screenshots/                 # Sprint review screenshots
`-- superpowers/                 # Approved design specifications and implementation plans
.github/workflows/               # Continuous integration
```

## Local Setup

### Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer
- A Supabase project

### Installation

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` from `.env.example` and provide the public values from Supabase project settings:

   ```text
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Apply `supabase/migrations/202607140001_create_profiles.sql` through the Supabase CLI or SQL editor.

4. In Supabase Auth URL configuration, set the site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL.

5. Start the application:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

For local dashboard visual QA without a live Supabase session, add `DASHBOARD_PREVIEW=true` to `.env.local`. The bypass is restricted to development mode and `/dashboard`; production builds retain the authenticated boundary.

## Commands

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start the local development server    |
| `npm run build`        | Create a production build             |
| `npm run start`        | Run the production server             |
| `npm run format:check` | Check Prettier formatting             |
| `npm run lint`         | Run ESLint with zero warnings allowed |
| `npm run typecheck`    | Run strict TypeScript checks          |
| `npm test`             | Run the complete test suite           |

## Authentication Architecture

Authentication sessions are stored in secure Supabase-managed cookies. Middleware refreshes sessions and applies route policy, while protected server pages repeat the user check as defense in depth. Browser code receives only the public anonymous key; service-role credentials are not used by the web application.

The `profiles` table references `auth.users` one-to-one. A database trigger provisions each profile, and RLS restricts authenticated users to selecting and updating their own profile.

## Dashboard UI Architecture

`src/app/dashboard/layout.tsx` owns the authenticated application shell. `DashboardView` remains a pure UI composition that consumes typed mock contracts from `features/dashboard/model`; shared primitives do not depend on dashboard or meeting domains.

Future integration should replace the mock adapter with server-side meeting queries, connect quick actions to upload and meeting routes, derive the welcome identity from the user profile, and map live processing states into the existing status and loading components. These points are intentionally isolated from the Sprint 2 presentation layer.

## Dashboard Screenshots

- Desktop: `docs/screenshots/sprint-2/dashboard-desktop.png`
- Tablet: `docs/screenshots/sprint-2/dashboard-tablet.png`
- Mobile: `docs/screenshots/sprint-2/dashboard-mobile.png`

Detailed responsive and accessibility results are recorded in `docs/qa/sprint-2-dashboard-qa.md`.

## Verification

The CI workflow runs formatting, linting, type checking, tests, and a production build on every pull request and every push to `main`.

Live authentication requires a configured Supabase project and cannot be exercised using the placeholder CI environment values.
