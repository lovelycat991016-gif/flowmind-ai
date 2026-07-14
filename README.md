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
├── app/                         # App Router pages, layouts, callback, and middleware entry
├── features/auth/               # Authentication actions, policies, schemas, and UI
└── shared/
    ├── config/                  # Validated public environment configuration
    ├── lib/supabase/            # Browser, server, and middleware Supabase adapters
    └── ui/                      # Reusable shadcn-style UI primitives
supabase/
└── migrations/                 # PostgreSQL schema and RLS migrations
docs/superpowers/plans/          # Reviewed implementation plans
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

## Verification

The CI workflow runs formatting, linting, type checking, tests, and a production build on every pull request and every push to `main`.

Live authentication requires a configured Supabase project and cannot be exercised using the placeholder CI environment values.
