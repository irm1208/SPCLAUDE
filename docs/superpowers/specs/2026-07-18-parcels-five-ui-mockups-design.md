# Parcel Page Five-Concept Mockup Design

Date: 2026-07-18

## Objective

Create an isolated, interactive comparison gallery containing five complete redesigns of the GB Organiser Parcels page. The concepts must preserve the page's existing parcel-tracking and parcel-intake workflows while exploring meaningfully different information hierarchies.

The live Parcels page under `artifacts/peps-anonymous/src/pages/organiser-v2/` remains unchanged during this mockup phase. All new work lives in `artifacts/mockup-sandbox/`.

## Preferred Direction

The preferred concept is **03 · Tracking Studio**.

Tracking Studio uses a master-detail layout:

- A searchable, filterable parcel index remains visible on the left.
- Selecting a parcel updates a persistent detail workspace on the right.
- The detail workspace shows the route stage, tracking history, destination, expected inventory, notes, and carrier actions without expanding table rows or leaving the page.
- Desktop prioritises simultaneous browsing and inspection. Narrow screens change to a list-first flow with a clear back action from parcel detail.

All five concepts remain available in the final gallery so they can be compared against the same data and workflow states.

## Shared Product Scope

Every concept supports the same mock Parcel workspace capabilities:

- View registered, in-transit, out-for-delivery, delivered, and exception parcels.
- Search by tracking number, carrier, reshipper, destination, or expected product.
- Filter by parcel status and carrier.
- Select a parcel and inspect its latest tracking state, full event history, destination, expected inventory, and internal note.
- Open an Add Parcel dialog with label, carrier, tracking number, optional custom tracking URL, items, and notes.
- Demonstrate carrier-link, copy-tracking, export, bulk-selection, and stock-intake actions without calling live services.
- Show explicit empty-search, missing-update, delayed-scan, exception, loading, and no-parcels states.

Actions that would normally write data are local and reversible. The gallery does not call production APIs, mutate the database, or modify the live organiser workspace.

## Shared Sample Data

All concepts use one typed local data set so visual comparisons are based on layout rather than different content. The set includes:

- Royal Mail parcel `RM123456789GB`, in transit to John's Reshipper in London, with 18 Semaglutide 5mg units.
- DHL Express parcel `DHL987654321`, out for delivery to Sarah's Forwarding in Manchester, with 12 Tirzepatide 10mg units.
- UPS parcel `1Z999AA10123456784`, received by Mike's Mail Service in Birmingham, with 24 BPC-157 5mg units.
- An Evri parcel with no scan for 42 hours, shown as an exception affecting 16 mixed-stock units.
- Additional registered, moving, and received records so totals, filters, boards, and table-density treatments are realistic.

The shared model contains parcel identity, carrier, tracking number, masked destination, reshipper, status, dates, expected items, route progress, tracking events, notes, and alert severity.

## Concept Designs

### 01 · Control List

A calm, production-oriented command page and the safest all-round replacement for the current UI.

- A compact KPI strip shows all parcels, in-transit count, arrivals due today, and attention count.
- A searchable table is the primary workspace.
- Selecting a row updates a persistent inspector containing the latest route events and expected stock.
- Export, filters, bulk selection, and Add Parcel remain directly accessible.

This concept optimises balanced scanning, search, and detail access.

### 02 · Delivery Pipeline

A stage-based flow board that makes parcel movement and bottlenecks visible.

- Columns represent Registered, In Transit, Due Today, Received, and Attention.
- Parcel cards show carrier, tracking reference, route progress, expected units, ETA, and reshipper.
- Exceptions remain in a visually isolated lane.
- Filters and registration controls sit above the board.

This concept optimises understanding where parcels are in the physical workflow.

### 03 · Tracking Studio

The selected and recommended direction.

- A persistent parcel index occupies the left side of the workspace.
- A detailed route and inventory inspector occupies the right side.
- Status tabs and search narrow the index without hiding the selected parcel context.
- A four-stage journey indicator and chronological tracking timeline make carrier progress immediately legible.
- Destination, expected inventory, notes, copy-tracking, and carrier actions remain visible beside the timeline.

This concept optimises rapid parcel-to-parcel inspection and detailed tracking work.

### 04 · Manifest Ledger

A dense, audit-friendly register inspired by shipping manifests.

- A compact totals rule shows manifest entries, expected units, received units, exceptions, and last sync.
- A high-density table exposes tracking, carrier, destination, contents, route progress, latest scan, and state simultaneously.
- Column controls, advanced filters, row selection, pagination, export, and bulk actions support larger parcel volumes.
- Typography and borders are restrained so density remains readable rather than decorative.

This concept optimises volume, traceability, and operational auditing.

### 05 · Exception Radar

A dark live-operations interface that amplifies risk and upcoming work.

- The top signal strip prioritises action-required routes, network health, arrivals due today, and units in motion.
- A route-network visual communicates movement and stalled nodes.
- An alert queue explains severity, affected stock, latest scan, and the next recommended action.
- Routine parcel movement remains accessible but visually subordinate to exceptions.

This concept optimises attention management during an active group buy.

## Gallery Architecture

Add one isolated component group under:

`artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/`

The group contains:

- `ParcelsPageConcepts.tsx`: gallery entry point, concept selection, shared interaction state, and dialogs.
- `data.ts`: typed sample parcels, concept metadata, status metadata, and filter helpers.
- `concepts.tsx`: the five bounded concept compositions and shared public props.
- `_group.css`: fully scoped tokens, layouts, concept treatments, responsive rules, focus states, and reduced-motion rules.
- `parcels-page-concepts.test.ts`: focused source and behavior contracts.

The gallery opens with all five choices visible and Tracking Studio marked Recommended. Selecting a concept opens its complete workspace preview while keeping a compact concept switcher available. Concept switching preserves the search query, status filter, carrier filter, and selected parcel when that parcel remains in the filtered result. Switching concepts closes the Add Parcel dialog so focus always returns to the newly selected preview.

Shared state belongs in the entry component. Each concept receives a small, explicit interface containing the filtered parcels, selected parcel, selection callback, filter state, and action callbacks. Concepts do not duplicate filtering logic or own independent copies of parcel data.

## Visual System

The concepts use the Peps Anonymous brand as their common foundation:

- Navy `#1B3A7A`, brand blue `#2D6BCC`, and deep navy `#1B3164` anchor navigation and primary actions.
- Primary light text is `#0F1F38`; secondary text is `#374151`; muted text uses `#6B7280` and `#8A9AAA`.
- Light concepts use `#F8FAFC` page surfaces, white cards, and subtle blue-grey borders.
- Success, warning, error, and info states use the established Peps Anonymous semantic colours.
- Inter remains the primary brand typeface.

The five concepts differ through spatial hierarchy, density, surface treatment, and interaction model rather than arbitrary recolouring. Exception Radar may use a dark operational surface, but its blue, navy, status semantics, and typography remain recognisably part of Peps Anonymous.

## Responsive Behaviour

The gallery and every concept support 375px, 768px, 1024px, and 1440px widths without horizontal page overflow.

- The gallery stacks concept previews on narrow screens.
- Shared organiser navigation follows the sandbox's existing responsive shell conventions.
- Control List changes its inspector into a full-screen detail sheet with a visible Back to parcels action.
- Delivery Pipeline becomes a horizontally paged stage view with an explicit stage selector rather than squeezing five columns.
- Tracking Studio becomes a list-first flow; selecting a parcel opens the detail workspace with a visible Back to parcels action.
- Manifest Ledger switches to a compact card/register view while preserving the most important manifest fields.
- Exception Radar stacks metrics, alerts, and route context with alerts before decorative network context.

Touch targets are at least 44px on narrow layouts. Tracking references wrap safely and do not force page overflow.

## Accessibility and Motion

- All icon-only controls have accessible names.
- Search fields, filters, selection controls, concept navigation, and Add Parcel inputs have explicit labels.
- Status is communicated with text and iconography, never colour alone.
- Keyboard focus is visible and follows the visual reading order.
- Dialogs expose a title, description, visible close control, focus containment, and Escape-to-close behaviour.
- Contrast meets WCAG AA for standard text and interactive controls.
- Transitions stay between 150ms and 300ms and are disabled or reduced under `prefers-reduced-motion: reduce`.

## Error and Empty States

The mockup remains local and deterministic, so network failures are not simulated as real requests. It still demonstrates the product states needed for a production redesign:

- A no-results state explains which filters are active and offers Clear filters.
- A no-parcels state leads with Register first parcel.
- Missing tracking events show Tracking updates have not started yet rather than an empty panel.
- Delayed scans and carrier exceptions show severity, affected inventory, latest known location, elapsed time, and a mock Resolve or Open carrier action.
- Form validation remains inline and identifies missing label, carrier, or tracking number without browser alerts.
- Unsupported custom carriers expose the custom tracking URL field and explain how it is used.

## Verification

Before delivery:

- Run a focused Node contract test proving all five concept identifiers, the Tracking Studio default/recommended state, shared parcel data, error states, Add Parcel dialog, and reduced-motion contract exist.
- Run the mockup sandbox TypeScript check.
- Run the mockup sandbox production build.
- Confirm the generated mockup route map includes `parcels-page-concepts/ParcelsPageConcepts`.
- Start the local preview and confirm the direct preview route returns HTTP 200.
- Inspect the rendered gallery for runtime errors and verify the five concepts can be selected.
- Check responsive source rules and, where browser tooling permits, inspect representative desktop and narrow layouts.

Unrelated pre-existing failures or repository conflicts are reported separately and are not fixed as part of this mockup task.

## Acceptance Criteria

The mockup gallery is ready for review when:

1. Five complete Parcel page concepts are available in one isolated comparison gallery.
2. The five concepts differ in information hierarchy and workflow emphasis, not merely colour or card styling.
3. Tracking Studio is visibly marked Recommended and opens as the initial full workspace.
4. Every concept uses the same parcel data and exposes the agreed search, filter, selection, detail, and Add Parcel workflows.
5. Empty, delayed, exception, validation, and missing-update states are intentional and accessible.
6. Desktop and narrow layouts remain usable without horizontal page overflow.
7. The mockup sandbox typecheck, focused tests, build, and direct preview route checks pass, except for clearly isolated pre-existing repository failures.
8. No production file under `artifacts/peps-anonymous/src/pages/organiser-v2/` is changed.
