# GB Organiser V2 QR Codes Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, interactive mockup-sandbox gallery containing five complete QR Codes page redesigns, with Peps Clear as the default lead direction and no changes to the production organiser page.

**Architecture:** Add one auto-discovered component group to `artifacts/mockup-sandbox`. Typed local order data and shared QR/status primitives feed five bounded concept components. A single gallery coordinator owns concept selection, filtering, selected-order state, and local posting/bulk-selection state, while a scoped stylesheet supplies concept tokens, responsive layouts, focus states, and reduced-motion behavior.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide React, Node’s built-in test runner, pnpm workspace scripts

---

## File Structure

- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/data.ts` for concept metadata, typed order records, status metadata, filters, and derived selectors.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodeArtwork.tsx` for deterministic local SVG QR artwork with accessible labels.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesShared.tsx` for shared avatars, status pills, metric cards, buttons, order summaries, and common workspace props.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/PepsClear.tsx` for the selected split-view queue studio.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/FlowBoard.tsx` for the Waiting → Ready → Posted board.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/BatchLedger.tsx` for the dense register and bulk-selection workflow.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/NightShift.tsx` for the dark control-room treatment.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/CompactOps.tsx` for the dense keyboard-oriented treatment.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesConcepts.tsx` as the auto-discovered gallery entry point and state coordinator.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css` for scoped tokens, layouts, concept themes, responsive rules, focus styles, and reduced motion.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts` for source-contract tests covering all five concepts and required interactions.

Do not hand-edit `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`; `mockupPreviewPlugin.ts` owns that registry and regenerates it during Vite startup/build. Do not modify files under `artifacts/peps-anonymous/src/pages/organiser-v2/` or `artifacts/peps-anonymous/src/components/GbQrCodesPanel.tsx`.

### Task 1: Define the test contract and shared local data

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/data.ts`

- [ ] **Step 1: Write the failing source-contract tests**

Create a Node test file that reads sibling source files without importing React modules:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("the gallery declares five QR redesign concepts", () => {
  const data = source("./data.ts");
  const entry = source("./QrCodesConcepts.tsx");
  for (const id of ["clear", "flow", "ledger", "night", "compact"]) {
    assert.match(data, new RegExp(`id: \\"${id}\\"`));
  }
  for (const label of ["Peps Clear", "Flow Board", "Batch Ledger", "Night Shift", "Compact Ops"]) {
    assert.match(data, new RegExp(label));
  }
  assert.match(entry, /PepsClear/);
  assert.match(entry, /FlowBoard/);
  assert.match(entry, /BatchLedger/);
  assert.match(entry, /NightShift/);
  assert.match(entry, /CompactOps/);
});

test("shared data contains all QR workflow states and carriers", () => {
  const data = source("./data.ts");
  for (const state of ["waiting", "ready", "posted"]) assert.match(data, new RegExp(state));
  for (const carrier of ["InPost", "Royal Mail", "DPD"]) assert.match(data, new RegExp(carrier));
  assert.match(data, /Winter Peptide Run 2025/);
  assert.match(data, /ORD-002/);
  assert.match(data, /ORD-011/);
});

test("entry exposes accessible local workflow interactions", () => {
  const entry = source("./QrCodesConcepts.tsx");
  const shared = source("./QrCodesShared.tsx");
  const css = source("./_group.css");
  assert.match(entry, /aria-label=\"Choose QR Codes concept\"/);
  assert.match(entry, /onMarkPosted/);
  assert.match(entry, /onBulkPost/);
  assert.match(shared, /aria-label/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
});
```

- [ ] **Step 2: Run the new test before creating the implementation files**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
```

Expected result: FAIL with `ENOENT` because the new sibling files do not exist.

- [ ] **Step 3: Add the typed concept and order model**

Define these exports in `data.ts`:

```ts
export type ConceptId = "clear" | "flow" | "ledger" | "night" | "compact";
export type QrStatus = "waiting" | "ready" | "posted";
export type FilterId = "all" | "waiting" | "ready" | "posted";
export type Carrier = "InPost" | "Royal Mail" | "DPD";

export type QrOrder = {
  id: string;
  code: string;
  member: string;
  username: string;
  initials: string;
  carrier: Carrier;
  destination: string;
  products: string;
  itemCount: number;
  status: QrStatus;
  payment: "confirmed" | "pending";
  uploadedAt: string | null;
  postedAt: string | null;
  reminder: string | null;
};

export type ConceptMeta = {
  id: ConceptId;
  number: string;
  label: string;
  description: string;
  recommendation?: string;
};

export const CONCEPTS: ConceptMeta[] = [
  { id: "clear", number: "01", label: "Peps Clear", description: "Split-view queue studio", recommendation: "Lead direction" },
  { id: "flow", number: "02", label: "Flow Board", description: "Visual status pipeline" },
  { id: "ledger", number: "03", label: "Batch Ledger", description: "High-volume operations" },
  { id: "night", number: "04", label: "Night Shift", description: "Dark queue control room" },
  { id: "compact", number: "05", label: "Compact Ops", description: "Keyboard-first density" },
];
```

Add thirteen fictional orders with exactly five `waiting`, three `ready`, and five `posted` records. Include `ORD-001`, `ORD-002`, `ORD-003`, `ORD-004`, `ORD-006`, `ORD-007`, `ORD-008`, `ORD-009`, `ORD-011`, `ORD-012`, `ORD-013`, `ORD-014`, and `ORD-015`; use the members `@john_doe`, `@sarah_m`, `@mike_fitness`, `@anna_p`, `@kate_london`, `@rachel_lab`, `@tom_w`, and `@ben_chem` across the set. Export `FILTERS`, `statusCounts(orders)`, and `filterOrders(orders, filter, query)`; search must match member, username, order code, carrier, or destination case-insensitively.

- [ ] **Step 4: Run the focused test and confirm only UI siblings are still missing**

Run the command from Step 2. Expected result: the data assertions pass, while the entry/shared-file assertions fail because those files have not been created yet.

- [ ] **Step 5: Commit the contract and data**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/data.ts artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
git commit -m "test: define QR Codes mockup contract and data"
```

### Task 2: Build shared QR artwork, controls, and theme foundation

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodeArtwork.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesShared.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css`

- [ ] **Step 1: Add deterministic local QR artwork**

Export this interface from `QrCodeArtwork.tsx`:

```tsx
export function QrCodeArtwork({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <svg className={`qr-mock-art qr-mock-art--${size}`} viewBox="0 0 210 210" role="img" aria-label={label}>
      <rect width="210" height="210" fill="#FFFFFF" />
      {/* Three finder patterns and deterministic modules; no remote image or API. */}
      <path d="M10 10h58v58H10zM18 18v42h42V18zm10 10h22v22H28zM142 10h58v58h-58zM150 18v42h42V18zm10 10h22v22h-22zM10 142h58v58H10zM18 150v42h42v-42zm10 10h22v22H28z" fill="currentColor" fill-rule="evenodd" />
      <path d="M82 10h12v12H82zM106 10h12v12h-12zM94 22h24v12H94zM82 34h12v24H82zM106 46h12v12h-12zM82 70h12v12H82zM106 70h24v12h-24zM10 82h12v12H10zM34 82h36v12H34zM82 82h12v24H82zM106 94h24v12h-24zM142 82h12v12h-12zM166 82h34v12h-34zM10 106h24v12H10zM46 106h24v12H46zM94 106h12v12H94zM118 106h24v12h-24zM154 106h12v24h-12zM178 106h22v12h-22zM70 118h12v24H70zM94 130h24v12H94zM130 118h12v12h-12zM178 130h22v12h-22zM82 154h12v12H82zM106 142h12v24h-12zM130 142h24v12h-24zM166 154h12v12h-12zM190 154h10v24h-10zM82 178h24v12H82zM118 166h12v24h-12zM142 178h36v12h-36zM178 190h22v10h-22zM142 94h12v12h-12zM34 118h12v12H34z" />
    </svg>
  );
}
```

- [ ] **Step 2: Add shared typed workspace props and semantic controls**

Export `WorkspaceProps`, `Avatar`, `StatusPill`, `MetricCard`, `IconButton`, `PrimaryButton`, `OrderIdentity`, and `OrderDetailLines` from `QrCodesShared.tsx`. `WorkspaceProps` must be:

```ts
export type WorkspaceProps = {
  orders: QrOrder[];
  selectedOrder: QrOrder | null;
  onSelectOrder: (id: string) => void;
  onMarkPosted: (id: string) => void;
  onBulkPost: (ids: string[]) => void;
  onFilter: (filter: FilterId) => void;
  activeFilter: FilterId;
  query: string;
  onQuery: (query: string) => void;
};
```

All icon-only buttons receive an explicit `aria-label`; status pills include text as well as a coloured indicator; search controls use `<label>` or an associated visually-hidden label.

- [ ] **Step 3: Establish scoped tokens and base layout rules**

Start `_group.css` with `.qrc-gallery` variables using Peps Anonymous tokens: `#1B3A7A`, `#2D6BCC`, `#1B3164`, `#0F1F38`, `#374151`, `#6B7280`, `#8A9AAA`, `#F8FAFC`, and semantic success/warning/error colours. Add `.qrc-gallery[data-concept="night"]` dark variables, `.qrc-gallery[data-concept="ledger"]` formal surface variables, `:focus-visible` rings, 44px narrow-screen hit targets, and:

```css
@media (prefers-reduced-motion: reduce) {
  .qrc-gallery *,
  .qrc-gallery *::before,
  .qrc-gallery *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run TypeScript checking for the new primitives**

Run:

```bash
pnpm --filter @workspace/mockup-sandbox typecheck
```

Expected result: the command may still fail because the five concept modules and gallery entry are not yet present; there must be no syntax errors in `QrCodeArtwork.tsx`, `QrCodesShared.tsx`, or `_group.css`.

- [ ] **Step 5: Commit the shared foundation**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodeArtwork.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesShared.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css
git commit -m "feat: add shared QR mockup primitives"
```

### Task 3: Implement the Peps Clear lead workspace

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/PepsClear.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css`

- [ ] **Step 1: Add the lead workspace interface**

Export `PepsClear(props: WorkspaceProps)`. Render a page heading titled `Shipping QR desk`, completion metrics, a search field, status filter controls, and a three-region workspace. Use `orders` for the queue and `selectedOrder` for the centre preview and right context panel.

- [ ] **Step 2: Implement queue selection and status-aware rows**

Each queue row is a semantic `<button>` with the member handle, order code, carrier, and status. Apply an `aria-pressed` state to the selected row. Waiting rows show a reminder cue; ready rows show an action cue; posted rows show a completion cue. When `orders` is empty, render a labelled no-results message with a clear-search button that calls `onQuery("")`.

- [ ] **Step 3: Implement the preview and order context regions**

Render `QrCodeArtwork` at large size for ready and posted orders, an explicit waiting state when `selectedOrder.status === "waiting"`, and detail lines for delivery, destination, products, and payment. Add a four-step local timeline and a primary `Mark order posted` button that is disabled unless the selected order is ready.

- [ ] **Step 4: Add the responsive lead layout**

Use `.qrc-clear-workspace` with queue, preview, and detail columns at desktop. At widths below 980px hide or stack the detail region below the preview; at widths below 680px make the queue and preview sequential, retain a visible selected-order heading, and keep primary actions at least 44px tall.

- [ ] **Step 5: Run the source contract and typecheck**

Run the focused Node test and `pnpm --filter @workspace/mockup-sandbox typecheck`. Expected: the Peps Clear source assertions pass; remaining failures identify only the four unimplemented concept modules and gallery entry.

- [ ] **Step 6: Commit the lead concept**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/PepsClear.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css
git commit -m "feat: add Peps Clear QR queue studio"
```

### Task 4: Implement Flow Board and Batch Ledger

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/FlowBoard.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/BatchLedger.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css`

- [ ] **Step 1: Implement Flow Board lanes**

Export `FlowBoard(props: WorkspaceProps)`. Partition `orders` by `waiting`, `ready`, and `posted`. Render labelled lanes with counts, cards containing member/order/carrier/destination, and a QR thumbnail plus local `Mark posted` action on ready cards. Card selection calls `onSelectOrder` and updates the selected visual state.

- [ ] **Step 2: Implement Flow Board empty and responsive states**

Each lane renders a text explanation when empty. At desktop use three columns; below 900px use an intentional horizontal lane scroller with a visible lane heading; below 680px show one lane at a time with a compact lane selector and no page-level overflow.

- [ ] **Step 3: Implement Batch Ledger selection and preview**

Export `BatchLedger(props: WorkspaceProps)`. Render a register table with a select-all checkbox, per-order checkboxes, member/order, carrier, destination, upload time, and status columns. Keep selected IDs local to the component, show a selection bar when one or more rows are selected, and call `onBulkPost(selectedIds)` from the bulk action. The preview panel uses `selectedOrder` and `QrCodeArtwork`.

- [ ] **Step 4: Add table-to-card responsive behaviour**

Below 760px, replace the dense table with labelled order cards that preserve checkbox, carrier, status, and preview actions. Ensure checkbox labels include the order code and member handle, and preserve a visible bulk-action bar.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
```

Expected: Flow Board and Batch Ledger assertions pass; Night Shift, Compact Ops, and the gallery entry remain the only missing implementation references.

- [ ] **Step 6: Commit the workflow alternatives**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/FlowBoard.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/BatchLedger.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css
git commit -m "feat: add QR flow board and batch ledger concepts"
```

### Task 5: Implement Night Shift and Compact Ops

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/NightShift.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/CompactOps.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css`

- [ ] **Step 1: Implement Night Shift with the shared workflow contract**

Export `NightShift(props: WorkspaceProps)`. Reuse the same queue/preview/detail semantics as Peps Clear, but apply the night concept token scope, live-sync header, dark operational metric strip, high-contrast status text, and a restrained cyan-blue focus accent. Keep `Mark hand-off complete` disabled for waiting orders and text-labelled for assistive technology.

- [ ] **Step 2: Implement Compact Ops with the shared workflow contract**

Export `CompactOps(props: WorkspaceProps)`. Render a narrow filter rail, compact summary metrics, dense queue table, persistent QR preview, and a keyboard-shortcut footer. Use `aria-keyshortcuts` on the relevant controls and keep a non-keyboard button path for every action.

- [ ] **Step 3: Add responsive and contrast rules**

Stack Night Shift regions below 980px and remove decorative glow under reduced motion. Convert Compact Ops rail to a horizontal filter row below 760px and stack its queue and preview below 640px. Add CSS rules ensuring dark concept body text and focus rings meet readable contrast.

- [ ] **Step 4: Run tests and typecheck**

Run the focused Node test and `pnpm --filter @workspace/mockup-sandbox typecheck`. Expected: all five concept module references now resolve; only the gallery entry may still be missing.

- [ ] **Step 5: Commit the visual variants**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/NightShift.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/CompactOps.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css
git commit -m "feat: add Night Shift and Compact Ops QR concepts"
```

### Task 6: Wire the gallery coordinator and sandbox entry point

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css`

- [ ] **Step 1: Add the gallery state model**

Export a default `QrCodesConcepts` component. Own these state values:

```tsx
const [concept, setConcept] = useState<ConceptId>("clear");
const [query, setQuery] = useState("");
const [filter, setFilter] = useState<FilterId>("all");
const [selectedOrderId, setSelectedOrderId] = useState(ORDERS[1].id);
const [postedIds, setPostedIds] = useState(() => new Set(ORDERS.filter(order => order.status === "posted").map(order => order.id)));
const [notice, setNotice] = useState<string | null>(null);
```

Derive `visibleOrders` through `filterOrders`, derive `selectedOrder` from the visible set with a safe fallback, and update local statuses when `onMarkPosted` or `onBulkPost` is called. A bulk post only changes selected ready records and leaves waiting records unchanged.

- [ ] **Step 2: Render the concept picker and context frame**

Render a labelled picker with exactly five buttons, `aria-pressed`, visible `01`–`05` numbering, the concept label, short description, and a `Lead direction` marker on Peps Clear. Render a compact browser-like frame with the group-buy context `Winter Peptide Run 2025` and a visible current concept name.

- [ ] **Step 3: Route state to the five concepts**

Use a `switch (concept)` that passes the same `WorkspaceProps` object to `PepsClear`, `FlowBoard`, `BatchLedger`, `NightShift`, or `CompactOps`. Do not duplicate order data or filtering logic inside concept components. Concept switching preserves query, filter, selected order when still visible, and local posted state.

- [ ] **Step 4: Add local feedback and safe selection behavior**

After local post or bulk post, show a non-blocking inline notice such as `3 labels marked posted in this mockup`. If filtering removes the selected order, select the first visible order; if there are no visible orders, pass `selectedOrder: null` and render the designed empty state. Do not use `alert()`.

- [ ] **Step 5: Complete source-contract coverage**

Extend `qr-codes-mockups.test.ts` with assertions for `aria-pressed`, `Winter Peptide Run 2025`, `useState<ConceptId>("clear")`, `filterOrders`, `onBulkPost`, and all five concept imports. Assert that no production path appears in the new group.

- [ ] **Step 6: Run the focused test, typecheck, and build**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
pnpm --filter @workspace/mockup-sandbox build
```

Expected: focused tests pass, TypeScript emits no errors from the new group, and Vite regenerates `.generated/mockup-components.ts` with `gb-organiser-qr-codes/QrCodesConcepts.tsx` without hand edits.

- [ ] **Step 7: Commit the gallery entry**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/QrCodesConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/_group.css artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
git commit -m "feat: wire five QR Codes mockups into sandbox gallery"
```

### Task 7: Verify rendered routes and responsive behavior

**Files:**
- Modify only if verification identifies a defect: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes/*`

- [ ] **Step 1: Confirm the generated module route**

Run:

```bash
rg -n "gb-organiser-qr-codes/QrCodesConcepts" artifacts/mockup-sandbox/src/.generated/mockup-components.ts
```

Expected: one generated dynamic-import entry exists. If absent, rerun the sandbox build; do not edit the generated file manually.

- [ ] **Step 2: Start the sandbox and inspect the direct preview**

Run:

```bash
cd artifacts/mockup-sandbox
MOCKUP_PORT=4179 MOCKUP_BASE_PATH=/ pnpm dev --host 0.0.0.0
```

Open `/preview/gb-organiser-qr-codes/QrCodesConcepts` and verify the default Peps Clear view, all five picker buttons, and no runtime error overlay.

- [ ] **Step 3: Exercise the required interactions**

Verify in the browser:

1. switching each concept changes the complete workspace;
2. searching `sarah_m` narrows the visible records;
3. switching to `waiting` shows no ready action;
4. selecting a ready order updates the QR preview and detail panel;
5. marking a ready order posted updates its local status and counts;
6. Batch Ledger row selection exposes its bulk action;
7. bulk posting changes only selected ready rows;
8. clearing search restores the dataset;
9. waiting, posted, and no-results states remain text-labelled.

- [ ] **Step 4: Inspect responsive layouts**

Check 1440px, 1024px, 768px, and 375px widths. Confirm no page-level horizontal overflow, usable 44px mobile controls, intentional kanban/table scrollers, readable QR labels, and a logical focus order.

- [ ] **Step 5: Run final verification commands**

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-qr-codes/qr-codes-mockups.test.ts
pnpm --filter @workspace/mockup-sandbox typecheck
pnpm --filter @workspace/mockup-sandbox build
git diff --name-only -- artifacts/peps-anonymous/src/pages/organiser-v2 artifacts/peps-anonymous/src/components/GbQrCodesPanel.tsx
```

Expected: focused test, typecheck, and build pass; the final `git diff` command prints no production QR implementation paths.

- [ ] **Step 6: Commit any final scoped polish**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-qr-codes
git commit -m "test: verify QR Codes mockup gallery"
```

## Plan Self-Review

- **Spec coverage:** five concepts, shared thirteen-order dataset, Peps Clear default, local interactions, responsive behavior, accessibility, empty states, no production edits, focused tests, typecheck, build, and route verification are each mapped to Tasks 1–7.
- **Placeholder scan:** no `TBD`, `TODO`, or unspecified implementation step is used. Every task names exact files, interfaces, commands, and expected outcomes.
- **Type consistency:** all five concepts consume `WorkspaceProps`; `ConceptId`, `FilterId`, `QrStatus`, and `QrOrder` are defined once in `data.ts`; the coordinator owns callbacks and state.
- **Scope check:** the plan contains one isolated mockup subsystem and does not include production API or organiser page changes.
