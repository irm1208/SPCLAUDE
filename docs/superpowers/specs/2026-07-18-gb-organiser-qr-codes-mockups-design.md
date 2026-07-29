# GB Organiser V2 QR Codes Mockups Design

**Date:** 2026-07-18  
**Status:** Approved design, pending written-spec review

## Purpose

Create five interactive redesign mockups for the GB Organiser V2 QR Codes page. The mockups will help compare meaningfully different workflows and visual treatments before any production page is changed.

The production `QrCodesTab` and `GbQrCodesPanel` remain unchanged. All work lives in the existing `artifacts/mockup-sandbox` application.

## Goals

- Provide five polished, full-page concepts rather than abstract wireframes or cosmetic reskins.
- Preserve the organiser's essential QR workflow: find an order, understand its status, inspect its label or QR image, and confirm that the order was posted.
- Use consistent, realistic group-buy data so workflow differences are easy to compare.
- Make Concept 01, Peps Clear, the lead direction and quality benchmark.
- Support desktop, tablet, and mobile review.
- Keep every interaction local, reversible, and independent of production APIs.

## Non-goals

- Replacing or modifying the production QR Codes page.
- Connecting mock interactions to organiser APIs.
- Persisting mock state after a page reload.
- Adding real member information or production QR images.
- Implementing drag-and-drop, notification delivery, file uploads, or exports beyond simulated controls.

## Location and Architecture

Create a focused mockup group under:

`artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/`

The group contains:

- one exported gallery component that owns concept selection;
- five concept views;
- shared sample-order data and view-model helpers;
- reusable presentation components for QR artwork, statuses, avatars, and common controls;
- one scoped stylesheet with responsive and reduced-motion rules;
- one structural test file.

The gallery is the preview entry point. Its concept picker switches between complete page designs without reloading. Shared data keeps usernames, order codes, carriers, timestamps, destinations, and statuses consistent across concepts.

## Shared Content Model

Each sample order includes:

- order ID and display code;
- member name, handle, and initials;
- delivery carrier and destination;
- product or vial count;
- payment status;
- QR status: `waiting`, `ready`, or `posted`;
- QR upload timestamp when applicable;
- posting timestamp when applicable;
- reminder timing for waiting orders.

The initial dataset contains thirteen orders: five waiting, three ready to post, and five posted. Eight orders have QR artefacts. Sample data is clearly fictional and includes a mix of InPost, Royal Mail, and DPD delivery methods.

QR previews use locally rendered SVG artwork. No remote images or network dependency are required.

## Concept 01: Peps Clear

Peps Clear is the selected lead direction. It uses a bright, brand-native split workspace with three persistent regions:

1. a prioritised member queue;
2. a large QR inspection stage;
3. selected-order context and posting action.

The page begins with completion and status metrics, followed by search and status filters. Selecting a queue row updates the preview and order context. Marking an order posted updates the local status and derived counts. The visual treatment follows the Peps Anonymous navy and blue palette, light surfaces, restrained shadows, and clear status colour usage.

## Concept 02: Flow Board

Flow Board models the work as a Waiting → Ready → Posted pipeline. Three visible lanes make queue balance and bottlenecks immediately legible. Cards show the member, order, carrier, destination, and timing. Selecting a ready card reveals a QR preview and posting action within the card or an adjacent detail surface.

Amber identifies waiting work, blue identifies ready work, and green identifies completed work. The concept prioritises progress visibility over compact density.

## Concept 03: Batch Ledger

Batch Ledger is a dense, formal register for high-volume fulfilment. A sortable table presents all operational fields without expanding every order. Checkbox selection enables a simulated bulk "mark posted" action. A persistent preview panel shows the active QR and order details while preserving the table context.

This concept prioritises scan speed, auditability, and batch processing. Its styling is more editorial and formal while retaining Peps brand anchors and status colours.

## Concept 04: Night Shift

Night Shift reinterprets the Peps Clear split workspace as a dark logistics control room. It keeps the same queue, preview, and order-context model so the visual treatment can be compared directly with Concept 01.

Deep navy surfaces, high-contrast text, cyan-blue operational accents, monospace status details, and restrained glow effects create the dark treatment. Contrast remains sufficient for labels, controls, and statuses.

## Concept 05: Compact Ops

Compact Ops is the high-density version of the Peps Clear workflow. It combines a compact queue table, persistent QR preview, narrow filter rail, summary metrics, and visible keyboard hints. It is intended for experienced organisers processing many labels in one session.

The concept uses the Peps light palette with tighter spacing, simpler decoration, and compact status markers. Mobile layouts remove keyboard-specific affordances and prioritise the active queue and preview.

## Interactions

The gallery supports:

- switching among all five concepts;
- selecting an order or card;
- changing status filters;
- searching the fictional order set;
- opening or focusing a QR preview;
- locally marking a ready order as posted;
- selecting multiple ledger rows and applying a simulated bulk posting action;
- resetting the mock state by reloading the page.

Controls that imply unavailable external work, such as export, send reminder, sync, or download, may provide a visible local acknowledgement but must not call an API.

## Responsive Behaviour

At wide desktop widths, the concepts show their complete information architecture. At tablet widths, secondary detail panels may collapse into drawers or stacked regions while the queue and preview remain usable. At mobile widths:

- concept selection remains horizontally scrollable;
- metrics wrap into two columns;
- queue, preview, and details become a deliberate sequence rather than a squeezed multi-column grid;
- kanban lanes become horizontally scrollable or selectable one at a time;
- the ledger becomes a card list with an accessible detail view;
- primary controls remain at least 44 pixels tall;
- no page introduces horizontal viewport overflow outside intentional scrollers.

## Accessibility

- Use semantic buttons for all interactive controls.
- Expose a clear current concept and selected order.
- Provide visible keyboard focus states.
- Give QR previews descriptive accessible labels.
- Do not rely on colour alone for waiting, ready, or posted states.
- Maintain readable contrast in light and dark concepts.
- Respect `prefers-reduced-motion`.
- Preserve logical keyboard and reading order when layouts collapse.

## Error and Empty States

Because mock data is local, network errors are out of scope. Each reusable workflow surface still includes designed states for:

- no search results;
- an empty status filter;
- an order waiting for a QR artefact;
- a ready order with an available preview;
- a posted order;
- no active order selection on narrow layouts.

Local actions must be safe when the active selection changes or becomes unavailable after filtering.

## Verification

Verification includes:

1. a structural test confirming all five concept IDs, labels, realistic status states, and accessible concept controls exist;
2. TypeScript checking for the mockup-sandbox package;
3. a production build of the mockup-sandbox package;
4. browser inspection of all five concepts at desktop and mobile viewport sizes;
5. interaction checks for concept switching, row or card selection, filtering, local posting, and ledger bulk selection;
6. confirmation that the production `QrCodesTab` and `GbQrCodesPanel` remain unchanged.

## Acceptance Criteria

- The mockup sandbox exposes one gallery containing exactly five complete QR Codes redesigns.
- The five designs are Peps Clear, Flow Board, Batch Ledger, Night Shift, and Compact Ops.
- Peps Clear is the default and most polished concept.
- Each concept shows realistic populated content and all three QR statuses.
- Each concept has a materially different workflow or density treatment; none is merely a colour swap.
- The lead concept supports interactive order selection, filtering, QR preview, and local posting state.
- The gallery works without external assets or API calls.
- Desktop and mobile layouts are usable and visually intentional.
- Structural tests, type checking, and the production build pass.
- No production QR Codes implementation file is modified.
