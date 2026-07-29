# GB Organiser V2 Top Navigation Redesign

Date: 2026-07-18

Status: Approved visual direction

## Objective

Redesign the desktop top navigation for GB Organiser V2 so organisers can identify the active group buy, find workspace content, and reach the primary order action without the current row feeling crowded.

The visual exploration compared five directions:

1. Quiet command bar — a low-risk refinement of the current row.
2. Group-first cockpit — a slim live group-buy context rail above the work bar.
3. Split identity rail — a navy workspace anchor joined to a white action area.
4. Floating workspace island — a rounded, elevated navigation surface.
5. Navy command deck — an inverse, high-contrast branded navigation bar.

The approved direction is **Group-first cockpit, revision B2**.

## Approved Desktop Composition

The navigation has two horizontal layers.

### Live Context Rail

A 32px navy gradient rail communicates the active group buy and its lifecycle at a glance. From left to right it contains:

- A green status indicator and the text `Open group buy` when the group buy is active.
- The active group-buy name.
- The group-buy currency.
- The relative close-date summary aligned toward the right.
- The current member count at the far right.

The rail uses white primary text and reduced-opacity supporting text. Status must also be written as text; colour is supplementary.

Status labels adapt to the source state rather than always displaying `Open group buy`. A missing close date displays `No close date`. A confirmed zero member count displays `0 members`; when the count is unavailable, the member item is omitted.

### Work Bar

A 70px white bar contains, from left to right:

1. A 44px menu control.
2. The current page label and the supporting label `GB Organiser workspace`.
3. The global group-buy search trigger.
4. The `Manage` action when organiser mode switching is available.
5. The page-specific primary action, such as `Create order`.
6. The organiser profile control.

`Share` and the standalone notification bell are intentionally omitted from the desktop top navigation.

## Control Details

### Menu

The menu remains a conventional three-line symbol so its purpose is immediately recognisable. It is presented inside a soft-blue 44px square with a 13px radius, no hard grey outline, and navy staggered strokes. The middle and bottom strokes are slightly shorter than the first, giving the control a more deliberate visual rhythm without changing its meaning.

The control retains the accessible name `Open navigation`, a visible focus state, and the existing drawer behaviour at breakpoints where the sidebar is unavailable.

### Search

Search is the dominant flexible control in the work bar:

- Minimum desktop width: 440px where viewport space permits.
- Flexible growth: it consumes the remaining space before fixed actions.
- Height: 46px.
- Placeholder: `Search orders, members, parcels…`.
- Leading search icon and trailing `⌘ K` shortcut hint.
- Existing click and keyboard shortcut behaviour remains authoritative.

The bar must not compress search below a usable input-like width to preserve every secondary action. Lower-priority content collapses first at narrower breakpoints.

### Actions

- `Manage` is a 44px-high outlined secondary action with its existing folder-management icon.
- The page-specific primary action is a 44px-high solid Brand Blue button.
- The current per-page label and navigation target remain driven by the existing workspace metadata.
- The primary action remains visually stronger than Manage but does not compete with the search field for width.

### Profile

The profile control retains the organiser avatar, username, role, and disclosure chevron. A subtle left divider separates it from page actions. Long usernames truncate safely and remain available through the control's accessible name or title.

## Responsive Behaviour

This mockup approval establishes the desktop direction. It does not replace the previously approved mobile navigation system.

- At 1024px and above, both context and work bars are visible.
- As space narrows, profile copy may collapse to the avatar before search is compressed.
- Page-specific secondary actions may collapse before the primary action.
- Below the existing mobile breakpoint, the established compact top bar and bottom navigation remain authoritative.
- Neither layer may create horizontal viewport overflow.

The exact tablet collapse points should be selected against real content during implementation rather than inferred from a single example username or group-buy name.

## Component and Data Boundaries

The redesign stays inside the existing organiser V2 shell:

- `OrganiserTopbar` remains the shared top-navigation component used by the live workspace and setup flow.
- The workspace supplies the group name, status, currency, close date, and member count from the active `SampleGB`/live group-buy projection already available to `Workspace`.
- The top bar formats relative close-date and member-count labels for display; it does not create or mutate group-buy state.
- Search continues to open the existing `GlobalSearch` experience.
- Manage continues to use the current mode-switch callback.
- Primary actions continue to use the current per-page navigation mapping.
- Removing Share and the bell from the top bar does not alter order, member, todo, or notification data contracts.

The setup flow may use a simplified context rail because a draft group buy has no live member or close-date state. It must keep its existing Save Draft, Preview, Continue, and Launch actions available, collapsing them according to the same priority rules.

## Interaction States

All interactive controls define hover, focus-visible, pressed, and disabled states. Focus order follows the visual left-to-right order. The menu, search, actions, and profile retain at least a 44px target size.

Transitions are limited to colour, border, and surface changes of 150–200ms. `prefers-reduced-motion` removes nonessential transitions.

## Accessibility

- Text and controls meet WCAG AA contrast on both navy and white surfaces.
- The live status includes a text label and does not rely on the green dot.
- The menu and any icon-only responsive controls have explicit accessible names.
- Keyboard shortcut text is decorative to screen readers; the search trigger itself has a complete accessible name.
- Keyboard focus remains clearly visible against every surface.
- Long group names, page labels, usernames, and translated strings truncate or wrap without colliding with actions.

## Loading and Fallback Content

- Unknown status displays `Group buy` without a semantic status colour.
- Missing currency is omitted rather than replaced with placeholder punctuation.
- A missing close date displays `No close date`.
- A zero or unavailable member total displays `0 members` only when zero is confirmed; otherwise the member item is omitted.
- Context values use the last successful group-buy projection during background refreshes.

Top-navigation data errors must not block search, navigation, Manage, the primary action, or profile access.

## Verification

- Add component contract tests for the two navigation layers and approved control order.
- Verify Share and the standalone notification bell are absent from the live workspace top bar.
- Verify live, draft, closed, missing-close-date, and long-name contexts.
- Verify search receives the dominant flexible width at desktop sizes.
- Verify keyboard navigation, `⌘/Ctrl + K`, focus visibility, and accessible names.
- Verify the setup flow retains all required draft actions.
- Verify desktop, tablet, and mobile breakpoints without horizontal overflow.
- Run the organiser contract tests, typecheck, production build, and a runtime visual smoke test.

## Acceptance Criteria

1. The desktop navigation matches approved Group-first cockpit revision B2.
2. The active group buy, lifecycle, currency, close timing, and member count are legible in the context rail when available.
3. Search is visually dominant and has at least 440px of width where the desktop viewport permits.
4. The refined menu uses a 44px soft-blue control with an accessible name and visible focus.
5. Share and the standalone notification bell are not rendered in the desktop top navigation.
6. Manage, the page-specific primary action, and the organiser profile remain available.
7. Existing search, menu, mode-switch, primary-action, and profile behaviours continue to work.
8. The navigation remains usable with keyboard, screen reader, long content, missing context values, and supported responsive widths.

## Out of Scope

- Redesigning the organiser sidebar.
- Replacing the approved mobile bottom navigation.
- Changing group-buy business rules, status values, API endpoints, or persistence.
- Moving Share or notifications elsewhere as part of this visual change.
- Redesigning page content below the top navigation.
