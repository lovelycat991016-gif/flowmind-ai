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

## Sprint 3

Sprint 3 delivers the owner-isolated Meeting Management MVP:

- PostgreSQL `meetings` migration with title constraints, `updated_at` trigger, indexes, and authenticated RLS policies
- Server Component reads for meeting list, detail, and live dashboard data
- Server Actions for create, rename, archive, restore, and permanent delete
- URL-driven title search, active/archived filtering, four sort modes, and 20-row pagination using a 21-row query
- Responsive create, list, detail, loading, error, empty, and non-disclosing not-found states
- Dashboard metrics for total, active, archived, and this-week meetings, plus latest active meetings

No API routes, audio upload, transcription, AI processing, action items, team workspaces, or future dependent tables are introduced.

## Sprint 4

Sprint 4 adds the audio upload foundation without processing audio:

- PostgreSQL `recordings` metadata with owner-only RLS and one active recording per meeting
- Private Supabase Storage `recordings` bucket restricted to each user's object-path prefix
- Client-side, Server Action, and bucket-level 500 MB file-size enforcement
- Supported MIME types: MP3, MP4, WAV, and WebM audio
- Authenticated Server Actions create upload intents, use Supabase Storage SDK-managed short-lived signed upload URLs, finalize verified uploads, and cancel upload attempts
- Browser uploads bytes directly to Storage, with progress, cancellation, retry, and accessible Chinese status feedback
- Meeting detail recording states for empty, uploading, uploaded, failed, cancelled, and archived meetings

The recording lifecycle is `pending` to `uploading`, then `uploaded`, `failed`, or `cancelled`. Failed and cancelled attempts remain operational history; retry creates a new upload intent rather than reusing a prior row.

Transcription, AI summaries, action extraction, and all background processing remain deferred.

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
|-- entities/recording/          # Recording types and presentation helpers
|-- features/
|   |-- auth/                    # Authentication actions, policies, schemas, and UI
|   |-- dashboard/               # Query-driven dashboard composition
|   |-- meetings/                # Server actions, queries, schemas, and meeting UI
|   `-- recordings/              # Recording actions, queries, schemas, and upload UI
|-- shared/
|   |-- config/                  # Validated public environment configuration
|   |-- lib/supabase/            # Browser, server, and middleware Supabase adapters
|   `-- ui/                      # Reusable shadcn-style UI primitives
`-- widgets/
    |-- app-shell/               # Responsive sidebar, header, drawer, and navigation model
    |-- dashboard/               # Query-driven dashboard widgets
    `-- meetings/                # Meeting list and detail compositions
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

3. Apply `supabase/migrations/202607140001_create_profiles.sql`, `supabase/migrations/202607160001_create_meetings.sql`, and `supabase/migrations/202607190001_create_recordings.sql` through the Supabase CLI or SQL editor.

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

## Meeting Architecture

`src/app/dashboard/layout.tsx` and `src/app/meetings/layout.tsx` use the authenticated application shell. Meeting reads live in `features/meetings/queries` and run from Server Components; mutations live in `features/meetings/actions` as Server Actions. `features/meetings/schemas` owns Zod input validation and URL list-state normalization.

The `meetings` table is the dashboard source of truth. Database constraints and RLS enforce the final ownership boundary; inaccessible detail rows return the same not-found route as missing rows. The browser never performs direct Supabase CRUD.

Future recordings, transcripts, summaries, action items, and storage objects must reference a meeting only after a deletion policy is chosen. Before shipping those dependencies, decide whether permanent meeting deletion cascades, is restricted, or runs a cleanup workflow. Sprint 3 only cascades from `auth.users` to `meetings` and deliberately creates none of those dependent artifacts.

## Audio Upload Architecture

Recording reads use `features/recordings/queries` with the authenticated Supabase server client and existing meeting RLS relationship. Upload mutations remain in `features/recordings/actions`: the server validates metadata and ownership, creates the recording intent, and requests a signed upload URL from the Supabase Storage SDK. The browser receives no service-role credential and uploads bytes directly to the private bucket using that URL.

The `recordings` table and `storage.objects` policies provide the final ownership boundary. A user's Storage path is `{user_id}/{meeting_id}/{recording_id}.{extension}`; public object URLs are not used. Signed upload URL expiration is SDK-managed and cannot be overridden by the application.

Failed or cancelled attempts may leave abandoned private Storage objects. Automated cleanup is intentionally deferred; production operations must periodically review this risk until a separately approved retention/cleanup workflow is implemented.

## Dashboard Screenshots

- Desktop: `docs/screenshots/sprint-2/dashboard-desktop.png`
- Tablet: `docs/screenshots/sprint-2/dashboard-tablet.png`
- Mobile: `docs/screenshots/sprint-2/dashboard-mobile.png`

Detailed responsive and accessibility results are recorded in `docs/qa/sprint-2-dashboard-qa.md`.

Sprint 3 validation notes, including the pending browser screenshot limitation, are recorded in `docs/qa/sprint-3-meeting-management-qa.md`.

Sprint 4 upload validation and operational-risk notes are recorded in `docs/qa/sprint-4-audio-upload-qa.md`.

## Verification

The CI workflow runs formatting, linting, type checking, tests, and a production build on every pull request and every push to `main`.

Live authentication requires a configured Supabase project and cannot be exercised using the placeholder CI environment values.
