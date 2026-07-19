# Parcel Page Five UI Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one isolated mockup-sandbox gallery with five complete, interactive redesigns of the GB Organiser Parcels page, with Tracking Studio as the recommended initial concept and no production Parcels-page changes.

**Architecture:** Keep one preview entry point under a new `parcels-page-concepts` mockup group. A typed local data module owns parcel records, status metadata, carrier choices, filtering, and draft validation; the entry component owns shared gallery state and renders five bounded concept compositions inside one shared organiser shell. All concept-specific layout and visual treatment is scoped in one group stylesheet. The sandbox's preview plugin auto-registers every `.tsx` file, so the five compositions live in the entry module rather than creating accidental internal preview routes.

**Tech Stack:** React 19, TypeScript, Vite mockup sandbox, CSS, Lucide React, Node's built-in test runner, existing `pnpm` workspace scripts. No production API, database write, or new dependency.

---

## File Map

- Create `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/data.ts` — `ConceptId`, parcel/status/draft types, the shared five-concept metadata, sample parcels and carriers, filter/count helpers, item-paste parser, and inline draft validation.
- Create `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx` — gallery picker, shared organiser shell, controlled search/filter/selection/dialog state, five concept renderers, notices, and accessible mock actions. Keeping JSX here prevents the auto-discovery plugin from treating internal concept modules as separate preview routes.
- Create `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css` — scoped Peps tokens, shell layout, five concept layouts, status treatments, dialog, focus states, responsive rules, and reduced-motion behavior. The leading underscore keeps the stylesheet out of the preview registry.
- Create `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts` — source contracts plus directly imported pure-model tests for all five concepts, shared data, filtering, validation, accessibility markers, and responsive/motion contracts.
- Auto-update `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` only through the existing Vite preview plugin/build; never hand-edit this generated file.
- Do not modify any file under `artifacts/peps-anonymous/src/pages/organiser-v2/`.

### Shared contracts

Use these exact public model shapes in `data.ts`:

```ts
export type ConceptId =
  | "control-list"
  | "delivery-pipeline"
  | "tracking-studio"
  | "manifest-ledger"
  | "exception-radar";

export type ParcelStatus =
  | "registered"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export type TrackingEvent = {
  timestamp: string;
  location: string;
  status: string;
  description: string;
};

export type Parcel = {
  id: string;
  orderId: string;
  label: string;
  memberName: string;
  memberUsername: string;
  reshipperName: string;
  reshipperAddress: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  shippedDate: string;
  estimatedDelivery: string;
  status: ParcelStatus;
  products: string[];
  unitCount: number;
  routeProgress: number;
  trackingUpdates: TrackingEvent[];
  note: string;
  severity: "none" | "watch" | "urgent";
};

export type ParcelDraft = {
  label: string;
  trackingNumber: string;
  carrier: string;
  customTrackingUrl: string;
  items: string[];
  notes: string;
};

export type ValidationErrors = Partial<Record<"label" | "trackingNumber" | "carrier", string>>;
```

The entry component consumes `CONCEPTS`, `SAMPLE_PARCELS`, `CARRIERS`, `STATUS_CONFIG`, `filterParcels`, `getStatusCounts`, `parseItemPaste`, and `validateParcelDraft` without reimplementing those rules.

## Task 1: Establish the failing contract and typed parcel model

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`
- Create: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/data.ts`

- [ ] **Step 1: Write the failing source and model tests**

Create the test file with these concrete checks:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONCEPTS,
  SAMPLE_PARCELS,
  filterParcels,
  getStatusCounts,
  parseItemPaste,
  validateParcelDraft,
} from "./data.ts";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("the data model exposes exactly five Parcel concepts", () => {
  assert.deepEqual(CONCEPTS.map(item => item.id), [
    "control-list", "delivery-pipeline", "tracking-studio", "manifest-ledger", "exception-radar",
  ]);
  assert.equal(CONCEPTS.find(item => item.id === "tracking-studio")?.recommended, true);
  assert.equal(SAMPLE_PARCELS.some(parcel => parcel.trackingNumber === "RM123456789GB"), true);
  assert.equal(SAMPLE_PARCELS.some(parcel => parcel.trackingNumber === "DHL987654321"), true);
  assert.equal(SAMPLE_PARCELS.some(parcel => parcel.severity === "urgent"), true);
});

test("parcel filtering searches operational fields and counts statuses", () => {
  assert.equal(filterParcels(SAMPLE_PARCELS, "Manchester", "all", "all").length, 1);
  assert.equal(filterParcels(SAMPLE_PARCELS, "DHL987654321", "all", "all")[0]?.id, "parcel-dhl");
  assert.equal(filterParcels(SAMPLE_PARCELS, "", "exception", "all").every(parcel => parcel.status === "exception"), true);
  assert.equal(filterParcels(SAMPLE_PARCELS, "", "all", "Royal Mail").every(parcel => parcel.carrier === "Royal Mail"), true);
  assert.equal(getStatusCounts(SAMPLE_PARCELS).all, SAMPLE_PARCELS.length);
});

test("item paste parsing and required draft validation are deterministic", () => {
  assert.deepEqual(parseItemPaste("Semaglutide 5mg, Tirzepatide 10mg\\nBPC-157 5mg"), [
    "Semaglutide 5mg", "Tirzepatide 10mg", "BPC-157 5mg",
  ]);
  assert.deepEqual(validateParcelDraft({ label: "", trackingNumber: "", carrier: "", customTrackingUrl: "", items: [], notes: "" }), {
    label: "Add an internal parcel label",
    trackingNumber: "Enter a tracking number",
    carrier: "Choose a carrier",
  });
  assert.deepEqual(validateParcelDraft({ label: "Batch 5", trackingNumber: "RM123", carrier: "royalmail", customTrackingUrl: "", items: [], notes: "" }), {});
});

test("the gallery entry and scoped stylesheet declare the required UI contracts", () => {
  const entry = source("./ParcelsPageConcepts.tsx");
  const css = source("./_group.css");
  for (const id of ["control-list", "delivery-pipeline", "tracking-studio", "manifest-ledger", "exception-radar"]) {
    assert.match(entry, new RegExp(id));
  }
  assert.match(entry, /Tracking Studio/);
  assert.match(entry, /aria-label="Add Parcel"/);
  assert.match(entry, /role="dialog"/);
  assert.match(entry, /aria-label="Search parcels"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
});
```

- [ ] **Step 2: Run the focused tests and verify the missing model fails**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
```

Expected: FAIL before implementation because `data.ts` and the gallery entry do not exist.

- [ ] **Step 3: Implement `data.ts` with the shared sample records and pure helpers**

Export `CONCEPTS` with these exact titles and descriptions:

```ts
export const CONCEPTS = [
  { id: "control-list", number: "01", title: "Control List", description: "Balanced KPIs, list scanning, and a persistent inspector.", recommended: false },
  { id: "delivery-pipeline", number: "02", title: "Delivery Pipeline", description: "A stage board for movement, arrivals, and bottlenecks.", recommended: false },
  { id: "tracking-studio", number: "03", title: "Tracking Studio", description: "Master-detail tracking with route and inventory context.", recommended: true },
  { id: "manifest-ledger", number: "04", title: "Manifest Ledger", description: "Dense, auditable parcel records for higher volume.", recommended: false },
  { id: "exception-radar", number: "05", title: "Exception Radar", description: "Attention-first monitoring for stalled routes and intake work.", recommended: false },
] as const;
```

Use at least these four records verbatim in `SAMPLE_PARCELS`: `parcel-rm` with Royal Mail / `RM123456789GB` / in transit / 18 units; `parcel-dhl` with DHL Express / `DHL987654321` / out for delivery / 12 units; `parcel-ups` with UPS / `1Z999AA10123456784` / delivered / 24 units; and `parcel-evri` with Evri / `H00EVR9820` / exception / 16 units / urgent severity. Add registered and additional moving records so the board and ledger show meaningful density. Include the masked reshipper names and locations from the approved spec.

Implement helpers with these signatures and behavior:

```ts
export function filterParcels(
  parcels: Parcel[],
  query: string,
  status: ParcelStatus | "all",
  carrier: string,
): Parcel[];

export function getStatusCounts(parcels: Parcel[]): Record<ParcelStatus | "all", number>;
export function parseItemPaste(value: string): string[];
export function validateParcelDraft(draft: ParcelDraft): ValidationErrors;
```

`filterParcels` lowercases and searches label, order ID, member name/username, reshipper, destination, carrier, tracking number, and product names; it then applies status and carrier filters. `parseItemPaste` splits commas, semicolons, pipes, and newlines, trims whitespace, removes blanks, and de-duplicates while preserving order. `validateParcelDraft` returns only required-field errors and never throws.

- [ ] **Step 4: Run the model tests and verify they pass while the source-contract test remains red**

Run:

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
```

Expected: the three data/helper tests pass; the source-contract test fails only because `ParcelsPageConcepts.tsx` and `_group.css` are not created yet.

- [ ] **Step 5: Commit only the new model and tests**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/data.ts artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "test: define five parcel mockup contracts"
```

## Task 2: Build the shared gallery state and organiser shell

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the shared state contract test before shell implementation**

Append these assertions to the source-contract test:

```ts
assert.match(entry, /useState<ConceptId>\("tracking-studio"\)/);
assert.match(entry, /aria-pressed=/);
assert.match(entry, /data-recommended/);
assert.match(entry, /Winter Peptide Run 2025/);
assert.match(entry, /Workspace/);
assert.match(entry, /Fulfilment/);
assert.match(entry, /Communication/);
assert.match(entry, /Group Buy/);
assert.match(entry, /Parcels/);
```

- [ ] **Step 2: Implement the gallery coordinator and shared state**

Start the entry component with these state values and derived rules:

```tsx
const [concept, setConcept] = useState<ConceptId>("tracking-studio");
const [query, setQuery] = useState("");
const [status, setStatus] = useState<ParcelStatus | "all">("all");
const [carrier, setCarrier] = useState("all");
const [selectedId, setSelectedId] = useState("parcel-dhl");
const [addOpen, setAddOpen] = useState(false);
const [notice, setNotice] = useState<string | null>(null);

const visibleParcels = filterParcels(SAMPLE_PARCELS, query, status, carrier);
const selectedParcel = SAMPLE_PARCELS.find(parcel => parcel.id === selectedId) ?? visibleParcels[0] ?? null;

function changeConcept(next: ConceptId) {
  setConcept(next);
  setAddOpen(false);
}

function clearFilters() {
  setQuery("");
  setStatus("all");
  setCarrier("all");
}

function showNotice(message: string) {
  setNotice(message);
  window.setTimeout(() => setNotice(null), 3200);
}
```

Render a labelled concept picker with five buttons, `aria-pressed`, `data-active`, and a visible `Recommended` marker on Tracking Studio. Keep the picker visible above the full preview. Render a compact browser-frame label so the sandbox route is clearly a design gallery, not production navigation.

- [ ] **Step 3: Implement the shared organiser shell and controls**

The shell must include a deep-navy organiser rail, a labelled sidebar, a top bar, and a main content area. Use these visible labels exactly: `Peps Anonymous`, `GB Organiser`, `Winter Peptide Run 2025`, `Workspace`, `Fulfilment`, `Communication`, `Group Buy`, `Parcels`, `Dispatch`, `Reshippers`, and `Back to main dashboard`. Include a top-bar search button, notifications button, organiser avatar, `Export`, and `Add Parcel` controls. Non-implemented navigation items are inert buttons with explanatory `aria-disabled="true"`; the Parcels item is active.

Use a shared status chip helper and a shared parcel identity helper so all concepts display tracking number, carrier, destination, and state consistently. Search and filter controls call `setQuery`, `setStatus`, and `setCarrier`; clicking a parcel calls `setSelectedId`.

- [ ] **Step 4: Add the scoped Peps token and shell CSS**

Define these variables at `.ppc-gallery`:

```css
.ppc-gallery {
  --ppc-page: #f8fafc;
  --ppc-panel: #ffffff;
  --ppc-panel-soft: #f2f6fa;
  --ppc-ink: #0f1f38;
  --ppc-text: #374151;
  --ppc-muted: #6b7280;
  --ppc-subtle: #8a9aaa;
  --ppc-navy: #1b3a7a;
  --ppc-deep: #1b3164;
  --ppc-blue: #2d6bcc;
  --ppc-line: #d0dae4;
  --ppc-line-soft: #e9eef3;
  --ppc-green: #22c55e;
  --ppc-amber: #e9a020;
  --ppc-red: #ef4444;
  min-height: 100dvh;
  overflow-x: hidden;
  color: var(--ppc-ink);
  background: var(--ppc-page);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

Add `data-concept` overrides for the dark Exception Radar surface, 8px–12px card radii, one-pixel borders, visible focus rings, 44px minimum interactive targets, stagger-free 180ms transitions, and:

```css
@media (prefers-reduced-motion: reduce) {
  .ppc-gallery *, .ppc-gallery *::before, .ppc-gallery *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}
```

- [ ] **Step 5: Run the source-contract tests and typecheck the shell**

Run:

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: source tests still fail for concept-specific markers, but TypeScript reports no errors in the new shell/data code.

- [ ] **Step 6: Commit the shared gallery foundation**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel mockup gallery shell"
```

## Task 3: Implement Control List (concept 01)

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the Control List contract test**

Assert that the entry contains `data-concept="control-list"`, `Parcel control`, `All parcels`, `In transit`, `Due today`, `Need attention`, `Selected parcel`, and `Open details`. Assert that the stylesheet contains `.ppc-control-list`, `.ppc-kpi-grid`, `.ppc-parcel-table`, and `.ppc-inspector`.

- [ ] **Step 2: Render the balanced KPI/table/inspector composition**

When `concept === "control-list"`, render a `section` with `data-concept="control-list"` containing:

```tsx
const counts = getStatusCounts(visibleParcels);

<header className="ppc-page-heading">
  <div><p className="ppc-eyebrow">Fulfilment workspace</p><h2>Parcel control</h2><p>Track inbound stock and every hand-off to your reshippers.</p></div>
  <div className="ppc-page-actions"><button type="button" onClick={() => showNotice("Export prepared for download")}>Export</button><button type="button" className="ppc-primary" aria-label="Add Parcel" onClick={() => setAddOpen(true)}>Add parcel</button></div>
</header>
<div className="ppc-kpi-grid">
  {[
    ["All parcels", counts.all],
    ["In transit", counts.in_transit],
    ["Due today", counts.out_for_delivery],
    ["Need attention", counts.exception],
  ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
</div>
<div className="ppc-control-layout">
  <section className="ppc-parcel-table" aria-label="Parcel list">
    <ParcelFilters query={query} status={status} carrier={carrier} onQuery={setQuery} onStatus={setStatus} onCarrier={setCarrier} />
    {visibleParcels.map(parcel => <ParcelRow key={parcel.id} parcel={parcel} selected={parcel.id === selectedId} onSelect={() => setSelectedId(parcel.id)} />)}
  </section>
  <aside className="ppc-inspector" aria-label="Selected parcel">
    {selectedParcel ? <ParcelInspector parcel={selectedParcel} onNotice={showNotice} /> : <EmptyParcels onClear={clearFilters} />}
  </aside>
</div>
```

Define `ParcelFilters`, `ParcelRow`, `ParcelInspector`, and `EmptyParcels` as local components in the same entry module. Every row has a labelled selection checkbox, a status chip with text, tracking number, carrier, destination, ETA, and an `onClick` selecting that parcel. The inspector renders all tracking events and a local `Open carrier` notice. `clearFilters` resets query, status, and carrier to their initial values.

- [ ] **Step 3: Add the Control List layout and responsive rules**

Use a two-column desktop layout (`minmax(0, 1.5fr) minmax(250px, .7fr)`), four KPI cards, a dense-but-readable table, and a persistent inspector. At `max-width: 760px`, stack the inspector under the list and keep its heading plus a `Back to parcels` button visible. Style selected rows with the active blue border and exceptions with the red semantic chip.

- [ ] **Step 4: Run the focused contract and typecheck**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: the Control List assertions pass; remaining concept assertions fail; typecheck passes.

- [ ] **Step 5: Commit Control List**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel control list concept"
```

## Task 4: Implement Delivery Pipeline (concept 02)

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the Delivery Pipeline contract test**

Assert for `data-concept="delivery-pipeline"`, `Delivery pipeline`, `Registered`, `In transit`, `Due today`, `Received`, `Attention`, and `on schedule`; assert `.ppc-pipeline-board`, `.ppc-pipeline-lane`, and `.ppc-parcel-card` in CSS.

- [ ] **Step 2: Render the five-stage board**

Render a gradient summary strip followed by five labelled lanes. Build lane data from the same filtered parcels, with explicit status grouping: registered, in transit, out for delivery (labelled `Due today` in the concept), delivered (labelled `Received`), and exception (labelled `Attention`). Each card renders carrier, tracking number, route progress bar, unit count, ETA/latest scan, and reshipper. Clicking a card updates the shared selected parcel and shows a `Selected parcel` notice or opens the shared detail sheet on narrow screens.

- [ ] **Step 3: Add desktop, tablet, and narrow board behavior**

Use five equal columns at desktop, a horizontally scrollable board with snap points at tablet widths, and a single active-lane selector plus vertically stacked cards below 760px. Keep lane headers sticky within the board and ensure exception cards have both red text and an `Exception` label.

- [ ] **Step 4: Run tests/typecheck and commit**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: Control List and Delivery Pipeline assertions pass; later concept assertions remain the only failures.

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel delivery pipeline concept"
```

## Task 5: Implement Tracking Studio (concept 03, recommended)

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the Tracking Studio contract test**

Assert for `data-concept="tracking-studio"`, `Tracking Studio`, `All parcels`, `Moving`, `Alerts`, `Live tracking history`, `Expected inventory`, `Masked address`, `Copy tracking`, `Open carrier`, and `Back to parcels`; assert `.ppc-studio`, `.ppc-studio-list`, `.ppc-studio-detail`, `.ppc-journey`, and `.ppc-event-list` in CSS.

- [ ] **Step 2: Render the master-detail workspace**

Render a left parcel index with search and status tabs. The selected item is `parcel-dhl` by default. Render the right detail area with:

1. Carrier, tracking number, label, masked reshipper destination, and action buttons.
2. A four-step journey indicator: Registered, In transit, Out for delivery, Received.
3. A chronological tracking event list from `trackingUpdates`.
4. Expected inventory, internal note, and destination information cards.

All action buttons call `showNotice` with an explicit mock confirmation; none opens a live URL. Use `aria-current="true"` on the selected parcel item and `aria-label` values that include the tracking number.

- [ ] **Step 3: Implement the narrow list-first flow**

At `max-width: 760px`, render only the parcel index until a parcel is selected; then show the detail pane as a full-width sheet with a visible `Back to parcels` button that clears the mobile detail state. Keep tracking references wrapping with `overflow-wrap:anywhere`.

- [ ] **Step 4: Run the focused contract tests and typecheck**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: the first three concept contracts and all pure-model tests pass; Manifest Ledger and Exception Radar assertions remain red.

- [ ] **Step 5: Commit the preferred concept**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add tracking studio parcel concept"
```

## Task 6: Implement Manifest Ledger (concept 04)

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the Manifest Ledger contract test**

Assert for `data-concept="manifest-ledger"`, `Manifest`, `Parcel register`, `Expected units`, `Received`, `Last sync`, `Columns`, `Showing`, and `Page`; assert `.ppc-ledger`, `.ppc-ledger-rule`, `.ppc-ledger-row`, and `.ppc-ledger-progress` in CSS.

- [ ] **Step 2: Render the auditable register**

Render the page heading, totals rule, search/filter/column toolbar, and a table with these columns in order: selection, tracking/carrier, destination, contents, route progress, latest scan, state. Show at least five rows from shared data, including an amber delayed row and a red exception row. Add a footer with visible result count and page indicator. Selection state is shared and the toolbar exposes a local `Export selected` notice.

- [ ] **Step 3: Add dense-layout responsive treatment**

At desktop, keep the full manifest table and use a monospace treatment only for tracking references and totals. At widths below 820px, replace the table with stacked manifest cards that retain tracking, destination, contents, latest scan, and state; expose the hidden fields through a `Show all fields` disclosure button.

- [ ] **Step 4: Run tests/typecheck and commit**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: all contracts except Exception Radar pass and the typecheck remains clean.

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel manifest ledger concept"
```

## Task 7: Implement Exception Radar (concept 05)

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add the Exception Radar contract test**

Assert for `data-concept="exception-radar"`, `Parcel signal`, `Action required`, `Network health`, `routes need intervention`, `Live route network`, `Open incident`, `Monitor`, and `Prepare intake`; assert `.ppc-radar`, `.ppc-signal-strip`, `.ppc-alert-stack`, and `.ppc-alert-card` in CSS.

- [ ] **Step 2: Render the attention-first dark workspace**

Render a dark navy surface with the same organiser shell labels, a signal strip showing two routes requiring intervention, network health, due-today count, and units moving. Add a CSS-only route network with labelled nodes for Birmingham, Manchester, and the urgent Leeds exception; it is a visual status summary, not a live map. Add an alert stack with the Evri stalled scan, Royal Mail watch state, and DHL upcoming intake, each showing severity, affected stock or ETA, and a mock next action.

- [ ] **Step 3: Add contrast and responsive rules**

Use light text on the dark surface, retain text labels next to status colour, and ensure alert cards remain readable at WCAG AA contrast. At narrow widths, render alerts before the decorative route network and stack all signal metrics.

- [ ] **Step 4: Run the full focused test and typecheck**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: all model and source-contract tests pass with five concepts present.

- [ ] **Step 5: Commit the fifth concept**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel exception radar concept"
```

## Task 8: Add the shared Add Parcel dialog, mock actions, and state coverage

**Files:**
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts`

- [ ] **Step 1: Add behavior contracts before wiring the form**

Assert that the entry contains labelled controls for `Label`, `Tracking Number`, `Carrier`, `Custom Tracking URL`, `Items in Parcel`, and `Notes`; `aria-invalid`, inline error rendering, `role="dialog"`, `aria-modal="true"`, `Close Add Parcel`, and `Clear filters`. Assert that the source uses `parseItemPaste` and `validateParcelDraft` rather than `alert(`.

- [ ] **Step 2: Implement the controlled dialog and validation**

Use a `ParcelDraft` state initialized to empty strings/array. On submit, call `validateParcelDraft`; render each error beneath its field and focus the first invalid input. On valid submit, show `Parcel draft saved locally`, close the dialog, reset the draft, and leave `SAMPLE_PARCELS` unchanged. Quick-add buttons use the shared product list; the custom item input accepts Enter and comma/newline/semicolon/pipe paste; each item has a labelled remove button. Escape and backdrop clicks close the dialog after returning focus to the Add Parcel trigger.

- [ ] **Step 3: Implement empty, missing-update, exception, and notice states**

When `visibleParcels` is empty, show `No parcels found`, the active query/filter summary, and a `Clear filters` button. When a selected parcel has no tracking events, show `Tracking updates have not started yet`. For delayed/exception records, show latest known location, elapsed time, affected unit count, and a local `Open carrier`/`Resolve locally` notice. Render notices in an `aria-live="polite"` region.

- [ ] **Step 4: Run all focused tests/typecheck and commit**

```bash
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm --filter @workspace/mockup-sandbox run typecheck
```

Expected: all tests pass, including the no-browser-alert assertion and validation model checks.

```bash
git add artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/ParcelsPageConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/_group.css artifacts/mockup-sandbox/src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
git commit -m "feat: add parcel mock interactions and states"
```

## Task 9: Verify generated registration, production build, and preview delivery

**Files:**
- Modify automatically: `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`
- Inspect only: `artifacts/mockup-sandbox/dist/index.html`

- [ ] **Step 1: Run the focused test and sandbox typecheck one final time**

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/parcels-page-concepts/parcels-page-concepts.test.ts
pnpm run typecheck
```

Expected: all model and source-contract tests pass; TypeScript exits 0.

- [ ] **Step 2: Run the production build and inspect generated registration**

```bash
MOCKUP_PORT=55171 MOCKUP_BASE_PATH=/__mockup pnpm run build
rg -n "parcels-page-concepts/ParcelsPageConcepts" src/.generated/mockup-components.ts
test -s dist/index.html
```

Expected: Vite exits 0, the generated module contains the exact gallery route key, and `dist/index.html` is non-empty. Do not manually edit the generated module.

- [ ] **Step 3: Start an isolated preview and check the direct route**

```bash
MOCKUP_PORT=55171 MOCKUP_BASE_PATH=/__mockup pnpm run preview --host 0.0.0.0
```

Check the route with:

```bash
curl -I http://127.0.0.1:55171/__mockup/preview/parcels-page-concepts/ParcelsPageConcepts
```

Expected: HTTP 200. Open that route in the browser and confirm the gallery starts on Tracking Studio, shows all five concept choices, switches concepts, filters parcels, opens/closes Add Parcel, and renders no runtime error overlay.

- [ ] **Step 4: Inspect responsive and accessibility behavior**

Use browser responsive widths 1440px, 1024px, 768px, and 375px. Confirm no horizontal overflow, a visible keyboard focus ring, a usable narrow Tracking Studio back action, readable dark Exception Radar alerts, and reduced-motion CSS presence. Record any sandbox-only pre-existing warning separately rather than changing production files.

- [ ] **Step 5: Commit only in-scope generated registration if it changed**

Inspect before staging:

```bash
git diff -- src/.generated/mockup-components.ts
```

If the diff contains only the new `ParcelsPageConcepts` route plus the preview plugin's deterministic ordering, stage and commit it:

```bash
git add artifacts/mockup-sandbox/src/.generated/mockup-components.ts
git commit -m "chore: register parcel mockup gallery route"
```

If the generated diff also contains unrelated workspace routes, leave it unstaged and report that it must be reconciled with the concurrent workspace changes.

## Plan Self-Review

- **Spec coverage:** The shared data task covers the approved parcel records and pure filtering/validation rules; the shell task covers the Peps Anonymous organiser context; Tasks 3–7 cover all five named concepts and their distinct information hierarchies; Task 8 covers Add Parcel, empty, missing-update, delayed, exception, validation, notice, accessibility, and reversible local actions; Task 9 covers responsive widths, reduced motion, generated route registration, build, preview, and runtime checks. The production-file exclusion is repeated in the file map and acceptance checks.
- **Completeness scan:** Every code step names the concrete data, labels, selectors, state, and behavior to implement; there are no deferred implementation instructions.
- **Type consistency:** `ConceptId`, `ParcelStatus`, `Parcel`, `ParcelDraft`, and `ValidationErrors` are defined before use. All later helper calls use the exact exported signatures from Task 1. `selectedParcel`, `visibleParcels`, and `setAddOpen` match the coordinator state defined in Task 2.
- **Sandbox constraint:** The auto-discovery behavior is explicitly accounted for by keeping internal JSX compositions in the single entry file and only creating the route required by the gallery.
