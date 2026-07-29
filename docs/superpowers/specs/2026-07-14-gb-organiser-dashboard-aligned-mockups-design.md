# GB Organiser Dashboard-Aligned Mockups

Date: 2026-07-14

## Objective

Create a separate interactive comparison gallery containing three fresh GB Organiser mockups. Every mockup must look native to the existing Salt & Peps customer dashboard while retaining organiser-specific navigation, group-buy data, and workflows.

This phase is visual exploration only. It must not modify `/gborganiser-v2` or replace any production organiser component.

## Shared Dashboard Visual System

All three concepts use the same shell and tokens as the current dashboard:

- A 56px deep-navy icon rail using `#032D60`.
- A 250px white labelled navigation panel beside the rail.
- Organiser-specific navigation grouped into Workspace, Fulfilment, Communication, and Group Buy sections.
- Active navigation uses `#0176D3`, a pale blue surface, and a left-edge indicator.
- A `#F3F3F3` page canvas, white panels, `#DDDBDA` borders, and compact 8px card radii.
- Inter typography with the dashboard's compact 10–15px supporting text and restrained 18–24px headings.
- The Peps Anonymous navy-to-blue gradient for the active group-buy feature panel and selected high-emphasis areas.
- The current dashboard's top bar, global search treatment, notifications, profile controls, light/dark theme behaviour, hover states, shadows, and responsive collapse pattern.

The shell must say **GB Organiser** and display organiser sections. It must not duplicate the customer dashboard's destination labels inside the organiser workspace.

## Mockup Directions

### 1. Dashboard Native

This is the recommended and closest visual match to the current dashboard.

- A compact gradient feature panel summarises the active group buy, time remaining, revenue, paid orders, and primary action.
- The main column contains an action queue, order momentum chart, and recent orders table.
- The right column contains four compact statistic cards, dispatch readiness, stock alerts, and today's activity.
- Card composition, spacing, table styling, and chart treatment mirror the customer dashboard.

### 2. Operations Focus

This direction retains the exact dashboard shell but increases operational density.

- The upper area prioritises urgent payment, stock, COA, testing, and dispatch exceptions.
- A compact status strip replaces the larger feature panel.
- The central area is table-first with filters, multi-select, and bulk actions.
- A narrow right column holds readiness, payment mix, and fulfilment progress.

### 3. Fulfilment Focus

This direction retains the exact dashboard shell but makes the physical order journey the main visual story.

- A horizontal pipeline shows Awaiting Payment, Paid, Preparing, and Dispatched stages.
- The main workspace combines the dispatch queue and the selected order detail.
- Supporting cards show parcel intake, stock allocation, label progress, and country destinations.
- Overview and Orders remain available so the concept is not limited to the dispatch tab.

## Views and Interactions

Each concept provides three working views:

- **Overview:** active group buy, metrics, action queue, order trend, and recent activity.
- **Orders:** search, status filters, row selection, bulk-action bar, and order detail drawer.
- **Dispatch:** stage switching, dispatch queue, stock/readiness information, and selected-order controls.

The comparison gallery also provides:

- A concept switcher that preserves the selected organiser view.
- A light/dark theme toggle matching the real dashboard.
- A command search opened by click or `Ctrl/Cmd + K`.
- Accessible keyboard focus, labelled icon controls, and Escape-to-close behaviour.
- Restrained 150–300ms transitions with `prefers-reduced-motion` support.
- Responsive layouts at 375px, 768px, 1024px, and 1440px without horizontal page overflow.

## Data

All concepts use the same group-buy sample model so comparisons reflect layout rather than different content:

- Active group buy: Winter Peptide Run 2025.
- Orders for Semaglutide, Tirzepatide, and BPC-157.
- Paid, pending, processing, and shipped states.
- UK, France, and Germany destinations.
- Payment proof, delivery method, tracking, stock, dispatch, COA, and testing information.

The data remains local to the mockup. No production API or database writes are permitted.

## Libraries

Use existing sandbox dependencies only:

- React for state and composition.
- Recharts for operational trends and summaries.
- Framer Motion for view, drawer, and selection transitions.
- Lucide React for the complete icon system.
- Radix UI primitives for accessible dialogs, dropdowns, and tooltips where appropriate.
- cmdk for command search.
- Sonner for reversible mock action feedback.

Libraries must improve interaction or accessibility. They must not add decorative complexity that conflicts with the dashboard style.

## Component Boundaries

The mockup is isolated under a new mockup-sandbox component group. Shared concept pieces are separated into:

- Dashboard-aligned shell and organiser navigation.
- Concept switcher and view navigation.
- Overview modules.
- Orders workspace and detail drawer.
- Dispatch workspace.
- Shared group-buy data and semantic status tokens.

Concept differences are expressed through composition and small scoped variants rather than three unrelated implementations.

## Error and Empty States

Mock interactions do not call live services. Search with no matches shows an explicit empty state. Actions that would normally write data show a mock confirmation toast and leave sample data recoverable. Drawers and dialogs always expose visible close controls and Escape handling.

## Verification

Before presenting the gallery:

- Run focused contract tests for all three concepts, views, dialogs, and reduced-motion support.
- Run the mockup-sandbox production build.
- Confirm the generated route map includes the new component.
- Start the preview on localhost and confirm the direct preview route returns HTTP 200.
- Check the new component for runtime errors independently of unrelated legacy mockups.
- Verify desktop and narrow responsive behaviour from the implemented CSS and available browser tooling.

## Acceptance Criteria

The gallery is ready for user review when:

1. The organiser navigation uses the exact two-part dashboard structure while retaining GB Organiser labels.
2. All concepts visibly belong to the existing dashboard product family.
3. The three concepts differ meaningfully in information hierarchy, not merely colour or card decoration.
4. Overview, Orders, and Dispatch interactions work in every concept.
5. The preview is available at a stable localhost URL.
6. `/gborganiser-v2` remains unchanged by this mockup phase.

