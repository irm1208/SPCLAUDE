# GB Organiser Typography and Mobile Visual System

Date: 2026-07-15

Status: Approved for implementation planning

## Objective

Replace the inconsistent typography and compressed mobile presentation in `/gborganiser-v2` with one professional visual system that belongs to the existing Peps Anonymous website.

The approved direction combines:

- **Desktop C:** the existing Inter family with a corrected, readable type scale.
- **Mobile C:** an action-first organiser workspace that prioritises work requiring attention instead of shrinking the desktop table.

This work changes presentation and responsive composition only. Existing organiser data, API integration, permissions, routes, and business behaviour remain authoritative.

## Typography Contract

The organiser continues to use the website's loaded `Inter` family. Supported weights are 400, 500, 600, and 700; the implementation must not depend on synthetic intermediate weights.

| Role | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Page title | 29px / 34px | 24px / 29px | 600 |
| Metric value | 24px / 28px | 21px / 25px | 700 |
| Section heading | 16px / 22px | 16px / 22px | 600 |
| Card and row title | 14px / 20px | 14px / 20px | 600 |
| Body copy | 14px / 21px | 14px / 21px | 400 |
| Controls and table cells | 13px / 18px | 13px / 18px | 500–600 |
| Supporting metadata | 12px / 17px | 12px / 17px | 400–500 |
| Labels and table headings | 11px / 15px | 11px / 15px | 600 |

No meaningful organiser text may render below 11px. Uppercase labels use modest tracking and remain short. Weight provides hierarchy only after size, colour, and spacing; body copy must not be bold by default.

## Shared Visual Tokens

- Primary navy: `#1B3A7A`.
- Interactive blue: `#2D6BCC`.
- Deep navy: `#1B3164` where a darker selected surface is required.
- Page surface: `#F8FAFC` with white content cards.
- Primary text: `#0F1F38`; body text: `#374151`; muted text: `#6B7280`.
- Subtle borders: `#D0DAE4` or the closest existing Peps token.
- Warning: `#E9A020`; success: `#22C55E`; error: `#EF4444`.
- Standard cards use a 12–14px radius, one-pixel border, and a restrained low-opacity shadow.
- Primary actions use solid navy. Blue is reserved for links, focus, selected navigation, and interactive emphasis.
- Status colour remains semantic. Cards must not become a collection of unrelated pastel fills.

## Desktop Composition

At widths of 1024px and above, the organiser remains a data-rich desktop workspace:

- The organiser sidebar and top bar remain visible.
- The page header uses the approved 29px title and 14px supporting copy.
- Summary metrics use compact white cards with consistent labels, values, and supporting states.
- Orders retain the full table, search, filter, selection, bulk-action, and detail-drawer workflow.
- Table rows use 13px content and 11px headings with comfortable row height; dense data must not be achieved by reducing text below the type contract.
- Main page spacing uses a predictable 8px base scale, with 20–24px section separation and 12–16px internal card padding.

The desktop Orders tab remains neutral and browsable. It does not inherit the mobile action-first reordering because desktop users have enough space for overview metrics and the complete table simultaneously.

## Tablet Composition

Between 768px and 1023px:

- The permanent sidebar becomes the existing accessible drawer.
- Four-column metric groups become two columns.
- Page actions wrap below the title without reducing control size.
- The orders table stays available inside its own bounded horizontal scroller when all columns are essential.
- Nonessential columns may be hidden only when their information remains available in the order detail drawer.
- Filters remain inline where space permits and otherwise use the same filter sheet as mobile.

The overall page must not create horizontal viewport overflow.

## Mobile Action-First Composition

Below 768px, the Orders tab becomes a mobile operating surface:

1. A compact branded top bar exposes the navigation drawer, active group buy, and organiser profile.
2. The 24px page title and 44px add action lead the page.
3. An attention summary explains how many orders need work and why.
4. Two primary action cards expose the current payment-chasing and dispatch queues.
5. Segmented views switch between **Needs action**, **All orders**, and **Completed**.
6. The priority queue renders orders as touch-friendly cards instead of a squeezed table.
7. A persistent bottom navigation exposes Overview, Orders, Dispatch, Members, and More.

The initial mobile queue is derived from live order state. It must not introduce a second source of truth. Selecting an action card applies the corresponding existing filter and reveals the resulting orders.

### Mobile Order Cards

Each card presents, in order:

- Order code and member identity.
- Total amount.
- The most important status or exception.
- A concise age, product-count, or due-date line when relevant.
- A clear affordance that opens the existing order detail experience.

Cards use at least 12px internal gaps, 13–14px content, and a minimum 44px interactive area. Repeated metadata that does not affect the next decision is left to order detail.

### Mobile Filters

- Search remains directly available on the All Orders view.
- Advanced filters open in an accessible bottom sheet.
- The collapsed trigger shows the applied-filter count.
- Apply closes the sheet and displays removable filter chips.
- Clear All is available inside the sheet and from the applied-filter summary.
- Focus returns to the trigger after the sheet closes.

## Responsive Navigation

- Desktop keeps the complete organiser sidebar.
- Tablet and mobile use the existing drawer for the full destination list.
- Mobile additionally exposes five high-frequency destinations in the bottom bar: Overview, Orders, Dispatch, Members, and More.
- **More** opens the complete organiser destination menu; it does not create a separate navigation hierarchy.
- The current destination is conveyed by colour, weight, and accessible state rather than colour alone.
- Bottom navigation accounts for device safe-area insets and never covers page content.

## Component and Data Boundaries

The redesign stays inside the existing organiser V2 structure:

- Shared typography, spacing, colour, surface, and breakpoint tokens live in the scoped organiser V2 CSS layer.
- The Orders tab continues to consume the current API-backed order repository and filter model.
- Desktop table rows and mobile order cards are two renderers of the same normalized order records.
- Attention counts and action queues are selectors derived from current order and dispatch states.
- The existing order detail drawer remains authoritative; mobile may present it as a full-height sheet while preserving its data and mutations.
- No API endpoint, database table, authentication rule, or live event contract changes as part of this visual phase.

## Interaction and Motion

- Touch targets are at least 44 by 44px on mobile.
- Hover, focus, pressed, selected, disabled, loading, empty, and error states are defined for all interactive surfaces.
- Transitions are restrained to 150–220ms and focus on drawer, sheet, selection, and list-state changes.
- `prefers-reduced-motion` removes nonessential movement.
- Destructive or irreversible order actions continue to require their existing confirmation behaviour.

## Accessibility

- Text and controls meet WCAG AA contrast against their surfaces.
- Keyboard focus remains visible using the Peps blue focus treatment.
- Drawer, bottom sheet, menus, and order details trap and restore focus correctly.
- Icon-only controls have accessible names.
- Status is available in text, not communicated by colour alone.
- Bottom navigation uses semantic navigation markup and exposes the active page.
- Mobile cards preserve a logical screen-reader order and do not rely on visually positioned content.

## Loading, Empty, and Error States

- Existing organiser skeletons adopt the final card geometry and typography spacing.
- Empty action queues state that no orders currently require that action and offer a route to All Orders.
- A failed queue or order request preserves the last successful data where available and provides an explicit retry action.
- Zero metrics display `0`, never a blank card.
- Long usernames, status labels, totals, and translated content wrap or truncate without colliding with actions.

## Implementation Scope

In scope:

- The complete organiser typography ramp and removal of undersized text.
- Desktop card, control, table, and spacing alignment with the approved system.
- Responsive tablet behaviour.
- Mobile action-first Orders composition, order cards, filter sheet, and bottom navigation.
- Applying the shared typography and responsive tokens across every organiser tab so tabs do not regress to mismatched sizing.

Out of scope:

- Changing the customer dashboard's typography.
- Rewriting organiser APIs or repositories.
- Adding new order statuses or business rules.
- Replacing desktop tables on large screens.
- Changing Peps Anonymous branding outside the organiser.

## Verification

- Add contract tests for the typography tokens, 11px minimum, responsive breakpoints, mobile navigation destinations, and Orders mobile composition.
- Add selector tests for the mobile attention and priority queues using normalized live order states.
- Verify every organiser destination at desktop, tablet, and 375px mobile widths.
- Verify keyboard and focus behaviour for drawer, filter sheet, bottom navigation, and order detail.
- Verify long content, empty queues, API errors, loading states, and reduced motion.
- Run the organiser test suite, frontend production build, and a runtime smoke test against the local API.

## Acceptance Criteria

The redesign is complete when:

1. Inter remains the organiser font and matches the website.
2. No meaningful organiser text is smaller than 11px.
3. Page titles, body copy, controls, labels, metrics, and tables follow one documented hierarchy on every tab.
4. Desktop Orders retains its complete table workflow.
5. Mobile Orders opens with live attention and action queues, then exposes card-based order browsing.
6. Mobile navigation, filtering, and order detail are usable with one hand and keyboard/screen reader access.
7. All existing API-backed organiser operations continue to work without data-contract changes.
8. The organiser has no horizontal viewport overflow at the supported breakpoints.
9. The final implementation visibly matches the approved Desktop C and Mobile C mockups.
