# GB Organiser V2 Products Redesign Mockups

Date: 2026-07-18

## Objective

Create five standalone, interactive desktop mockups for the Products page in GB Organiser V2. The mockups are an isolated exploration in the mockup sandbox; they do not replace or modify the production organiser route. Each concept must make high-volume catalogue maintenance feel faster and safer while preserving the existing product-management workflow.

## Context

The live V2 workspace currently renders the `ProductsTab` from `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx` inside the approved organiser shell. The existing page supports product creation and editing, deletion, CSV mapping/import, AI PDF/image extraction, vendor/category/size/price/stock fields, maximum-per-customer limits, and half-kit toggles. Its current presentation is a dense stack of controls and rows.

The repository already contains a separate Vite mockup sandbox. The redesign work belongs there so visual comparison does not alter `/gborganiser-v2`, its APIs, or its persisted data. The existing V2 sidebar and topbar are part of the visual context and remain fixed in every concept.

## User-approved decisions

- Deliver five isolated mockup previews, not five live production implementations.
- Keep the approved GB Organiser V2 sidebar and topbar fixed; vary the Products workspace only.
- Make the five concepts genuinely different information architectures, not cosmetic colour variations.
- Optimise first for fast catalogue editing and bulk updates.
- Design for 100+ products; the sample catalogue therefore contains 120 deterministic products.
- Prioritise desktop layouts (1280–1600px). Responsive/mobile refinement is explicitly deferred until a direction is selected.
- Use the unified shared foundations behind five independent preview routes/components. The user selected standalone previews as the presentation structure, while shared data and shell primitives are allowed to prevent drift.
- Split Inspector is the current benchmark direction. Vendor Matrix is the preferred direction from the final comparison pair. Batch Studio remains in the five-concept set.

## Shared experience contract

Every preview uses the same active group buy context, `Winter Peptide Run 2025`, and the same product dataset. The fixed shell must visibly retain the organiser navigation and active Products location so the comparison is about the workspace hierarchy.

All concepts expose the full workflow contract:

- Search by product name, vendor, size, or category.
- Filter, sort, and make the result count explicit.
- Select one or many products and apply bulk changes.
- Add, edit, and delete products locally in the mockup.
- Import CSV/TSV data with column mapping and a review step.
- Import an AI-extracted PDF/image price list with duplicate and price-change review.
- Edit vendor, category, size/mg, price, stock, maximum-per-customer, and half-kit availability.
- Show live, paused, low-stock, out-of-stock, unlimited, duplicate, and price-change states.

Interactions are local to each preview. They must provide visible confirmation, preserve recoverability with an undo or reset affordance where an action is destructive or broad, and never call a production API.

## Five concept directions

### 1. Command Grid

Command Grid is the fastest high-density option. A spreadsheet-like table is the primary workspace, with a search/filter strip above it and a sticky bulk-action bar that appears when rows are selected. Price, stock, vendor, category, and limit cells can be edited in place. A column menu controls density and visibility, and keyboard movement between rows/cells is part of the concept.

This direction is strongest for organisers who already know the catalogue and need to update many rows quickly. It deliberately trades some per-product context for scan speed.

### 2. Split Inspector

Split Inspector keeps a compact, searchable result list on the left and a persistent product inspector on the right. Selecting a row opens the full product form without leaving the list, and the selected row remains visually anchored while the organiser edits. The inspector shows unsaved state, availability, limits, and save/delete controls together.

This is the benchmark direction because it balances high-volume scanning with a clear focused editing surface. It is especially suitable when changes require reading or validating several fields rather than changing one cell.

### 3. Category Workbench

Category Workbench adds a catalogue map rail beside the product area. Categories become collapsible groups with counts, average prices, and group-level actions. Saved views such as Low stock and Missing vendor sit below the taxonomy. The main list can expand or collapse groups so an organiser can make a coherent category-wide change without losing orientation.

This direction is strongest for catalogues whose structure and member-facing grouping matter. It trades some raw row density for wayfinding and group-level context.

### 4. Batch Studio

Batch Studio treats a bulk change as a reviewable change set. The organiser defines a product query (for example, vendor QSC plus category GLP-1), stages one or more field changes, and reviews a before/after diff before applying. The right-side summary shows affected products, field updates, validation errors, and recent change sets.

This is the safest option for large-scale edits and supplier updates. It intentionally adds a review step, making it slower for a single quick edit but safer for broad changes.

### 5. Vendor Matrix

Vendor Matrix organises the catalogue around supplier relationships. A vendor rail shows product counts and saved exception views; the selected vendor panel shows live prices beside supplier prices, import/update actions, and rows that need review. CSV and AI imports are first-class actions in the header and within the vendor context.

This is the preferred supplier-oriented direction from the visual comparison. It is strongest when price lists arrive from multiple vendors and the organiser needs to reconcile changes without losing the source context.

## Component and route boundaries

Create the new mockup group under:

`artifacts/mockup-sandbox/src/components/mockups/gb-products-redesign/`

The group should have these focused boundaries:

- `data.ts` — typed product, vendor, category, import, and status fixtures; deterministic generation of 120 products.
- `ProductShell.tsx` — fixed V2 organiser shell and preview frame. It owns no concept-specific product state.
- `shared.tsx` — status badges, toolbar controls, mock toast, confirmation, and undo affordances.
- `CommandGrid.tsx` — only Command Grid layout and state.
- `SplitInspector.tsx` — only Split Inspector layout and state.
- `CategoryWorkbench.tsx` — only Category Workbench layout and state.
- `BatchStudio.tsx` — only Batch Studio layout and state.
- `VendorMatrix.tsx` — only Vendor Matrix layout and state.
- Scoped stylesheet(s) for shared brand tokens and concept-specific composition; styles must not leak into production pages.
- Focused source-contract tests for the five concepts and their required interactions.

Each concept is independently discoverable by the mockup sandbox’s generated preview map at `/preview/gb-products-redesign/CommandGrid`, `/preview/gb-products-redesign/SplitInspector`, `/preview/gb-products-redesign/CategoryWorkbench`, `/preview/gb-products-redesign/BatchStudio`, and `/preview/gb-products-redesign/VendorMatrix`. Shared foundations may be imported, but each preview must render correctly without another concept being mounted first.

## Local data and interaction flow

The fixture model contains product identity, vendor, category, mg size, price, stock (including unlimited), maximum-per-customer, half-kit state, visibility, and import metadata. Product IDs and generated values are stable between reloads so screenshots and comparisons are repeatable.

Each preview clones the fixture into local state on mount. Search, filters, selection, edits, staged changes, import review, and confirmation dialogs operate on that clone. A reset action returns the preview to its original fixture. Import flows use representative local rows rather than network calls:

1. Parse or simulate incoming rows.
2. Mark new, duplicate, and price-changed rows.
3. Let the organiser include, skip, or edit rows.
4. Apply the accepted rows to the local catalogue and show a reversible confirmation.

Broad actions (bulk edits, imports, deletes, and Batch Studio apply) show a confirmation or diff before committing to local state. Single-field edits can save inline but must surface a saved state.

## Accessibility and error states

- All icon-only controls have accessible labels and visible focus rings.
- Selection controls expose the product name in their accessible label.
- Dialogs and confirmation surfaces have a labelled heading, explicit close control, and Escape handling.
- Keyboard users can reach search, filters, row selection, editors, and primary actions in a sensible order.
- Empty search results identify the active query and offer a clear/reset action.
- Invalid prices, stock quantities, limits, and unmapped import columns show inline errors without discarding other edits.
- Duplicate and price-changed imports are visually distinct and never silently overwrite existing rows.
- Destructive actions require confirmation and provide an undo/reset path in the mockup.
- Tables and dense panels may scroll internally, but the page shell must not develop horizontal overflow at the target desktop widths.

## Visual language

Use the existing Peps Anonymous tokens as the source of truth: deep navy and navy-to-blue gradient for shell emphasis, brand blue for active controls, white product panels on the light organiser canvas, subtle navy borders, green success states, amber warnings, and red destructive states. Keep the approved shell unchanged across concepts. Concept differentiation should come from information hierarchy, density, grouping, and interaction model rather than unrelated branding.

Use restrained transitions for selection, drawers, staged changes, and feedback. Respect `prefers-reduced-motion`. Avoid production API calls, persistent writes, or dependencies that are not already installed in the mockup sandbox.

## Verification plan

Before presenting the completed gallery:

1. Run focused source-contract tests covering all five preview components, shared shell usage, required product fields, import review, bulk selection, and reduced-motion styles.
2. Run the mockup sandbox TypeScript check and production build.
3. Confirm the generated preview map contains all five direct routes.
4. Start the local preview server and verify each direct preview route returns HTTP 200.
5. Exercise representative local interactions in each concept: search/no-results, selection, edit/save, import review, bulk action or staged change, confirmation, and reset/undo.
6. Confirm no files under `artifacts/peps-anonymous/src/pages/organiser-v2/` or production API routes changed as part of the mockup work.

## Acceptance criteria

The mockup set is ready for user review when:

1. Five direct, standalone Products previews are available in the mockup sandbox.
2. The approved GB Organiser V2 shell is consistent in all five previews.
3. The five concepts are meaningfully different in information architecture and all handle 100+ products.
4. Split Inspector and Vendor Matrix visibly provide the strongest focused editing and supplier reconciliation paths respectively, while the other three remain credible alternatives.
5. Core product-management workflows and mock import/bulk-edit interactions work locally in every preview.
6. Error, empty, confirmation, and recovery states are explicit and accessible.
7. Build, typecheck, route discovery, and focused tests pass without touching production organiser code.

## Non-goals

- Replacing the live Products page during this exploration.
- Changing the approved organiser shell or production navigation.
- Connecting imports, edits, or deletes to live APIs or databases.
- Completing mobile design before a desktop direction is selected.
- Choosing a final production concept; the gallery is intended for user comparison first.
