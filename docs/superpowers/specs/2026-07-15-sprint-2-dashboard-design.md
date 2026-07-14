# Sprint 2 Dashboard Design

## Status

Approved on 2026-07-15. Visual direction: **Option A, Calm Workspace**.

## Objective

Deliver a production-quality, responsive dashboard experience using local mock data only. Sprint 2 changes presentation, layout, reusable UI components, and design tokens. It does not add meeting CRUD, Supabase queries, API routes, AI processing, or database changes.

## Product Structure

### Header

- Reserved meeting search field
- Reserved notifications control
- Accessible user menu with identity and existing sign-out action

### Sidebar

- Dashboard, active
- Meetings
- Summaries, reserved
- Action Items, reserved
- Settings

Reserved navigation is visible for information architecture but marked unavailable to assistive technology and cannot navigate.

### Main Content

- Welcome banner with primary mock action
- Four statistics cards
- Recent Meetings populated from local mock data
- Quick Actions using local presentation behavior only
- Compact empty state showing that no recordings are currently processing

## Layout

The desktop shell uses a 240-pixel persistent sidebar, a 64-pixel header, and a restrained centered content region. The main region uses a 12-column mental grid without exposing a rigid card mosaic: statistics form one row, then Recent Meetings occupies the wider track while Quick Actions and the empty state share the narrower track.

The page is calm rather than sparse. Borders and surface contrast establish hierarchy; shadows are reserved for menus and elevated mobile navigation. Cards are individual data or action units and are never nested.

## Responsive Behavior

- **Desktop, 1200 pixels and wider:** 240-pixel sidebar, four-column statistics, two-track content region.
- **Tablet, 768 to 1199 pixels:** 72-pixel icon sidebar, two-column statistics, Recent Meetings above a two-column secondary region.
- **Mobile, below 768 pixels:** fixed top header, menu-triggered navigation drawer, one-column content, two-column statistics where space permits, and meeting rows that preserve readable metadata without horizontal scrolling.

Stable widths, minimum heights, grid tracks, and icon-button dimensions prevent layout movement between loading and populated states.

## Design System

### Spacing

Use a 4-pixel base scale: 4, 8, 12, 16, 20, 24, 32, 40, and 48 pixels. Primary content gaps use 24 pixels on desktop and 16 pixels on mobile.

### Typography

Use the system sans-serif stack for predictable rendering. Dashboard page title is 28 pixels on desktop and 24 pixels on mobile. Section titles are 16 to 18 pixels. Body copy is 14 pixels. Metadata and badges are 12 pixels. Font weight and whitespace establish hierarchy; letter spacing remains zero.

### Color

Light mode uses cool neutral backgrounds, white surfaces, charcoal text, green as the FlowMind action color, muted blue for time-based metrics, amber for open work, and restrained gray for secondary information. Dark-mode tokens are defined at the root and can be activated by a future theme control without component rewrites.

### Shape and Elevation

Controls use 6-pixel radii. Cards use 8-pixel radii. Pills are limited to status badges. Default cards use borders with a minimal surface shadow; menus and drawers use stronger elevation.

## Reusable Components

- Application shell, sidebar, header, mobile navigation drawer
- Button and icon-button variants
- Card header, title, description, content, and footer
- Badge variants
- Skeleton
- Empty placeholder
- Loading state
- Statistic card
- Recent meeting row/list
- Quick action item
- Section heading

Components receive data and callbacks through props. Dashboard mock data is isolated from view components so Sprint 3 can replace it without altering presentation contracts.

## Accessibility

- Semantic landmarks: navigation, banner, main, sections, lists, and tables where applicable
- One visible page heading with ordered section headings
- Keyboard-operable mobile navigation and user menu
- Escape key and backdrop close the mobile drawer; focus returns to the trigger
- Visible focus rings with sufficient offset on every interactive control
- Icon-only controls have accessible names and tooltips where meaning is not familiar
- Reserved controls use disabled semantics and remain legible
- Text and actionable controls target WCAG AA contrast in light and dark token sets
- Touch targets are at least 40 by 40 pixels
- Reduced-motion preference disables nonessential transitions

## Loading and Empty States

`src/app/dashboard/loading.tsx` mirrors the final dashboard geometry with reusable skeletons. The populated mock dashboard includes a compact empty placeholder for the processing queue, demonstrating the reusable empty-state component without contradicting Recent Meetings mock content.

## Verification

Automated tests cover component semantics, dashboard content contracts, navigation state, and loading/empty components. Browser QA covers 1440x1000 desktop, 1024x900 tablet, and 390x844 mobile viewports. Each pass checks overflow, overlap, spacing, hierarchy, keyboard focus, navigation behavior, and screenshots. Issues are recorded in the implementation plan and fixed before the Sprint commit.

## Future Integration Points

- Replace `dashboard-mock-data.ts` with a meeting query adapter.
- Connect Upload and New Meeting commands to Sprint 3 workflows.
- Activate Meetings and Settings routes when those views exist.
- Activate Summaries and Action Items after their product Sprints.
- Replace reserved search and notification controls with application services.
- Preserve component props and loading contracts while changing the data source.
