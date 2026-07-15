# Sprint 2 Dashboard QA

## Scope

The Calm Workspace dashboard was reviewed in the in-app browser using local mock data and the development-only dashboard preview. No API, Supabase query, meeting mutation, or AI workflow was exercised.

## Responsive Validation

| Viewport  | Navigation                   | Dashboard layout                                                             | Result |
| --------- | ---------------------------- | ---------------------------------------------------------------------------- | ------ |
| 1440x1000 | 240px labeled sidebar        | Four statistics in one row; recent meetings and quick actions in two columns | Pass   |
| 1024x900  | 72px icon rail               | Two-by-two statistics; recent meetings followed by a two-column utility area | Pass   |
| 390x844   | Header menu and modal drawer | Two-by-two statistics; all content stacked in reading order                  | Pass   |

All three viewports were checked for horizontal overflow, clipped text, incoherent overlap, component resizing, alignment, and spacing. No horizontal overflow remained after fixes. Visible controls are at least 40px high.

## Interaction Validation

- Mobile navigation opens with focus on Dashboard, locks background scrolling, closes on Escape, and returns focus to the menu button.
- Tab and Shift+Tab remain inside the mobile modal drawer.
- The user menu exposes the signed-in identity, reports expanded state, and closes on Escape.
- Upload recording, View meeting history, and Review action items link to visible in-page targets.
- Search, notifications, summaries, action items navigation, and settings are visibly and semantically unavailable placeholders.

## Accessibility Notes

- The shell uses banner, complementary, navigation, main, dialog, menu, list, region, heading, and status semantics.
- The page has one visible `h1`; section and empty-state headings preserve hierarchy.
- Icons that do not add meaning are hidden from assistive technology.
- Keyboard focus uses a visible 2px accent outline with 2px offset.
- Measured contrast ratios: body text 16.39:1, welcome heading 15.51:1, welcome muted copy 4.83:1, primary action 6.47:1, card muted copy 5.49:1, and Complete status 5.67:1.
- Reduced-motion preferences disable nonessential transitions and animations.

## Issues Found And Fixed

1. At exactly 1024px, Tailwind's `lg` breakpoint expanded the full desktop sidebar. Sidebar expansion, header offset, and main offset now use `xl`, with a regression test.
2. The modal drawer did not initially contain Tab navigation. A focus-loop regression test and first/last focus handling were added.
3. The first desktop artifact captured the loading skeleton before the dashboard settled. Final captures wait for the welcome heading.
4. The in-app browser capture surface used Windows display scaling and produced clipped stitched images. Final evidence uses calibrated, non-stitched viewport captures; this was a QA tooling issue, not application overflow.

## Screenshots

- `docs/screenshots/sprint-2/dashboard-desktop.png`
- `docs/screenshots/sprint-2/dashboard-tablet.png`
- `docs/screenshots/sprint-2/dashboard-mobile.png`

## Deferred

- Functional search, notifications, and reserved navigation destinations
- Real user profile display names
- Meeting CRUD and upload workflows
- Live processing status, summaries, and action items
- User-controlled theme selection; dark semantic tokens are already defined
