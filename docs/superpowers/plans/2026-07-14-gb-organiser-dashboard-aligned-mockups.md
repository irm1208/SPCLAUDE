# GB Organiser Dashboard-Aligned Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate interactive gallery of three GB Organiser mockups that use the exact visual system of the current customer dashboard without modifying `/gborganiser-v2`.

**Architecture:** Add one isolated component group to the Vite mockup sandbox. Shared typed data, shell, and reusable view modules establish the dashboard visual language; three concept configurations change information hierarchy while preserving the same organiser navigation and interactions. Static contract tests verify required source structure, and the sandbox production build plus localhost preview verify registration and delivery.

**Tech Stack:** React, TypeScript, CSS, Recharts, Framer Motion, Lucide React, Radix Dialog/Dropdown/Tooltip, cmdk, Sonner, Vite, Node test runner

---

## File Structure

- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/data.ts` for concept metadata, group-buy records, orders, pipeline, and semantic types.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DashboardOrganiserShell.tsx` for the two-part dashboard navigation, top bar, theme state, and content frame.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OverviewConcepts.tsx` for the three dashboard-aligned Overview compositions.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OrdersWorkspace.tsx` for filters, selection, bulk actions, and order detail.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DispatchWorkspace.tsx` for dispatch stages, queue, and readiness details.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/GbOrganiserDashboardConcepts.tsx` as the gallery entry point and interaction coordinator.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css` for scoped dashboard tokens, responsive layouts, themes, and motion preferences.
- Create `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts` for focused source-contract tests.

No production file under `artifacts/peps-anonymous/src/pages/organiser-v2/` is modified.

### Task 1: Establish the Mockup Contract and Typed Data

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/data.ts`

- [ ] **Step 1: Write the failing source-contract tests**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("gallery exposes three dashboard-aligned organiser concepts", () => {
  const entry = source("./GbOrganiserDashboardConcepts.tsx");
  const data = source("./data.ts");
  for (const id of ["native", "operations", "fulfilment"]) {
    assert.match(data, new RegExp(`id: \\"${id}\\"`));
  }
  for (const view of ["overview", "orders", "dispatch"]) {
    assert.match(data, new RegExp(`id: \\"${view}\\"`));
  }
  assert.match(entry, /DashboardOrganiserShell/);
});

test("shell follows the real dashboard navigation contract", () => {
  const shell = source("./DashboardOrganiserShell.tsx");
  const css = source("./_group.css");
  assert.match(shell, /GB Organiser/);
  assert.match(shell, /Workspace/);
  assert.match(shell, /Fulfilment/);
  assert.match(shell, /Communication/);
  assert.match(shell, /Group Buy/);
  assert.match(css, /#032D60/i);
  assert.match(css, /#0176D3/i);
  assert.match(css, /prefers-reduced-motion/);
});

test("orders and dispatch expose accessible operational interactions", () => {
  const orders = source("./OrdersWorkspace.tsx");
  const dispatch = source("./DispatchWorkspace.tsx");
  assert.match(orders, /aria-label="Select order/);
  assert.match(orders, /Order details/);
  assert.match(dispatch, /aria-label="Dispatch stages"/);
  assert.match(dispatch, /Dispatch readiness/);
});
```

- [ ] **Step 2: Run the tests and verify the missing files fail**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts
```

Expected: FAIL with `ENOENT` for `GbOrganiserDashboardConcepts.tsx` or another new source file.

- [ ] **Step 3: Create the typed sample-data module**

Define and export these exact types:

```ts
export type ConceptId = "native" | "operations" | "fulfilment";
export type ViewId = "overview" | "orders" | "dispatch";
export type ThemeId = "light" | "dark";
export type OrderStatus = "Paid" | "Pending" | "Processing" | "Shipped";

export type OrganiserOrder = {
  id: string;
  member: string;
  username: string;
  initials: string;
  products: string;
  secondary: string;
  status: OrderStatus;
  payment: string;
  proof: string;
  shipping: string;
  tracking: string;
  total: number;
  country: string;
  createdAt: string;
};
```

Export `CONCEPTS`, `VIEWS`, `NAV_GROUPS`, `ORDERS`, `MOMENTUM`, `PIPELINE`, `ACTION_QUEUE`, and `STOCK_ROWS`. Use `Winter Peptide Run 2025`, the four specified order statuses, Semaglutide/Tirzepatide/BPC-157 products, and UK/France/Germany destinations.

- [ ] **Step 4: Run the focused test and confirm it still fails for UI files only**

Run the command from Step 2.

Expected: FAIL because the entry, shell, orders, and dispatch source files have not been created; `data.ts` is no longer the missing file.

- [ ] **Step 5: Commit the contract and data**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/data.ts artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts
git commit -m "test: define dashboard organiser mockup contract"
```

### Task 2: Build the Exact Dashboard-Aligned Organiser Shell

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DashboardOrganiserShell.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css`

- [ ] **Step 1: Add the shell component using organiser-specific navigation**

Export this public interface:

```tsx
type DashboardOrganiserShellProps = {
  concept: ConceptId;
  view: ViewId;
  theme: ThemeId;
  onView: (view: ViewId) => void;
  onTheme: () => void;
  onSearch: () => void;
  children: React.ReactNode;
};

export function DashboardOrganiserShell(props: DashboardOrganiserShellProps) {
  // Render .god-shell with a 56px .god-rail, a 194px labelled .god-sidebar,
  // and .god-workspace. Use NAV_GROUPS and invoke onView only for the three
  // implemented preview views. Keep all organiser labels visible.
}
```

The icon rail must show the active organiser location, Tickets, Back to dashboard, and Collapse controls. The labelled panel must say `GB Organiser`, show `Winter Peptide Run 2025`, and group the organiser links under Workspace, Fulfilment, Communication, and Group Buy.

- [ ] **Step 2: Add the scoped dashboard token foundation**

Start `_group.css` with the exact dashboard variables:

```css
.god-gallery {
  --god-page: #f3f3f3;
  --god-panel: #ffffff;
  --god-panel-2: #fafaf9;
  --god-border: #dddbda;
  --god-border-soft: #edebe9;
  --god-text: #181818;
  --god-muted: #5c5c5c;
  --god-subtle: #8c8c8c;
  --god-accent: #0176d3;
  --god-accent-soft: rgba(1, 118, 211, 0.1);
  --god-rail: #032d60;
  --god-gradient: linear-gradient(120deg, #1b3164 0%, #1b3a7a 45%, #2d6bcc 100%);
  min-height: 100dvh;
  background: var(--god-page);
  color: var(--god-text);
  font-family: Inter, "Salesforce Sans", "Helvetica Neue", Arial, sans-serif;
}

.god-gallery[data-theme="dark"] {
  --god-page: #0e0e12;
  --god-panel: #17171c;
  --god-panel-2: #1d1d23;
  --god-border: rgba(255, 255, 255, 0.08);
  --god-border-soft: rgba(255, 255, 255, 0.05);
  --god-text: #f5f5f7;
  --god-muted: #a0a0ab;
  --god-subtle: #6e6e78;
  --god-accent-soft: rgba(1, 118, 211, 0.18);
}
```

Use 8px card radii, one-pixel borders, compact shadows, 40px navigation rows, 44px minimum interactive hit areas, and a 72px desktop top bar.

- [ ] **Step 3: Add desktop and mobile shell behaviour**

At `max-width: 1023px`, hide the labelled sidebar, keep the top bar, and expose an organiser menu button. At `max-width: 767px`, collapse the rail, replace it with a five-item bottom navigation, and add bottom safe-area padding. Do not allow horizontal page overflow.

- [ ] **Step 4: Run the focused contract test**

Run the Task 1 test command.

Expected: FAIL only because the entry, Orders, and Dispatch modules remain missing.

- [ ] **Step 5: Commit the shell foundation**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DashboardOrganiserShell.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css
git commit -m "feat: add dashboard-aligned organiser mockup shell"
```

### Task 3: Implement the Three Overview Compositions

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OverviewConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css`

- [ ] **Step 1: Add the shared overview props and chart**

```tsx
type OverviewConceptsProps = {
  concept: ConceptId;
  onOrder: (order: OrganiserOrder) => void;
  onView: (view: ViewId) => void;
};

export function OverviewConcepts({ concept, onOrder, onView }: OverviewConceptsProps) {
  if (concept === "operations") return <OperationsOverview onOrder={onOrder} onView={onView} />;
  if (concept === "fulfilment") return <FulfilmentOverview onOrder={onOrder} onView={onView} />;
  return <NativeOverview onOrder={onOrder} onView={onView} />;
}
```

Use Recharts `ResponsiveContainer`, `AreaChart`, `CartesianGrid`, `XAxis`, `YAxis`, and `Tooltip` for order momentum. Include a readable text summary in `aria-label` on the chart container.

- [ ] **Step 2: Implement Dashboard Native**

Render the dashboard-native gradient feature panel, a left content column with Action Queue, Order Momentum, and Recent Orders, plus a 340px right column with a 2×2 stat grid, Dispatch Readiness, Stock Alerts, and Today. Match the dashboard's 20px section gaps and compact header controls.

- [ ] **Step 3: Implement Operations Focus**

Render a compact four-cell status strip, urgent action queue, full-width operational orders table, and 300px right column containing payment confirmation, fulfilment progress, stock exceptions, and COA/testing readiness.

- [ ] **Step 4: Implement Fulfilment Focus**

Render a four-stage horizontal pipeline, dispatch queue, selected parcel summary, country distribution, and parcel/stock/label readiness cards. Keep the same panel tokens and header scale as the other concepts.

- [ ] **Step 5: Add scoped overview layouts and responsive fallbacks**

Define `.god-native-grid`, `.god-operations-grid`, and `.god-fulfilment-grid`. Stack right columns below the main column under 1180px, reduce charts at 768px, and convert dense tables to labelled cards below 640px.

- [ ] **Step 6: Commit the Overview concepts**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OverviewConcepts.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css
git commit -m "feat: add dashboard organiser overview concepts"
```

### Task 4: Implement Orders and Dispatch Workspaces

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OrdersWorkspace.tsx`
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DispatchWorkspace.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css`

- [ ] **Step 1: Create the Orders public interface and local filtering**

```tsx
type OrdersWorkspaceProps = {
  concept: ConceptId;
  onOrder: (order: OrganiserOrder) => void;
  onFeedback: (message: string) => void;
};

export function OrdersWorkspace({ concept, onOrder, onFeedback }: OrdersWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | OrderStatus>("All");
  const [selected, setSelected] = useState<string[]>([]);
  // Filter ORDERS by member, username, product, ID, and status.
}
```

Render a dashboard card containing search, status filters, accessible order checkboxes labelled `Select order ORD-…`, a responsive table, an explicit no-results state, and a floating bulk-action bar when rows are selected.

- [ ] **Step 2: Use Radix Dropdown Menu for row and bulk actions**

Provide `Mark paid`, `Move to preparing`, `Export selected`, and `Clear selection`. Mock actions call `onFeedback` and keep the sample records recoverable.

- [ ] **Step 3: Create the Dispatch public interface and stage state**

```tsx
type DispatchWorkspaceProps = {
  concept: ConceptId;
  onOrder: (order: OrganiserOrder) => void;
  onFeedback: (message: string) => void;
};

export function DispatchWorkspace({ concept, onOrder, onFeedback }: DispatchWorkspaceProps) {
  const [stage, setStage] = useState("Preparing");
  // Render an aria-labelled stage control and stage-specific order queue.
}
```

Use the visible label `Dispatch readiness`, provide stage counts, selected-order actions, stock allocation, label progress, and destinations. The stage control must be reachable by keyboard and must not depend on colour alone.

- [ ] **Step 4: Add workspace, table, drawer, and mobile-card styling**

Use the dashboard's 8px cards, pale-blue active rows, 11px table headers, 12.5–13.5px table content, semantic status chips, and 150–220ms state transitions. Under 640px, hide table headers and show each row as a labelled card.

- [ ] **Step 5: Run the focused test**

Run the Task 1 test command.

Expected: FAIL only because the gallery entry point has not been created.

- [ ] **Step 6: Commit the operational workspaces**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/OrdersWorkspace.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/DispatchWorkspace.tsx artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css
git commit -m "feat: add organiser orders and dispatch mockups"
```

### Task 5: Assemble the Interactive Comparison Gallery

**Files:**
- Create: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/GbOrganiserDashboardConcepts.tsx`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/_group.css`
- Modify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts`

- [ ] **Step 1: Add the gallery coordinator state**

```tsx
export default function GbOrganiserDashboardConcepts() {
  const [concept, setConcept] = useState<ConceptId>("native");
  const [view, setView] = useState<ViewId>("overview");
  const [theme, setTheme] = useState<ThemeId>("light");
  const [openOrder, setOpenOrder] = useState<OrganiserOrder | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="god-gallery" data-theme={theme}>
      <ConceptPicker concept={concept} onConcept={setConcept} />
      <DashboardOrganiserShell concept={concept} view={view} theme={theme} onView={setView} onTheme={() => setTheme(t => t === "light" ? "dark" : "light")} onSearch={() => setSearchOpen(true)}>
        {view === "overview" && <OverviewConcepts concept={concept} onOrder={setOpenOrder} onView={setView} />}
        {view === "orders" && <OrdersWorkspace concept={concept} onOrder={setOpenOrder} onFeedback={toast} />}
        {view === "dispatch" && <DispatchWorkspace concept={concept} onOrder={setOpenOrder} onFeedback={toast} />}
      </DashboardOrganiserShell>
    </div>
  );
}
```

Use `AnimatePresence` for view transitions and include Sonner's `<Toaster />`.

- [ ] **Step 2: Add the concept picker**

Place a compact comparison control above the browser frame. Each button includes the concept number, name, one-line purpose, and selected indicator. Changing concept preserves `view`.

- [ ] **Step 3: Add cmdk search in a Radix Dialog**

Search group-buy orders, organiser sections, and dispatch actions. Clicking a result updates the view or opens the matching order. Support `Ctrl/Cmd + K`, Escape, visible dialog title, and a no-results state.

- [ ] **Step 4: Add the Radix order-detail dialog/drawer**

Display the order ID, member, products, payment proof, delivery method, destination, tracking, total, and semantic status. Include visible Close and mock Update status actions. The action uses Sonner feedback and does not mutate production data.

- [ ] **Step 5: Complete gallery, modal, and reduced-motion CSS**

Add a framed preview treatment outside the product shell, keep product styling exact inside the frame, and include:

```css
@media (prefers-reduced-motion: reduce) {
  .god-gallery *,
  .god-gallery *::before,
  .god-gallery *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Run focused tests and verify green**

Run:

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 7: Commit the assembled gallery**

```bash
git add artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts
git commit -m "feat: add dashboard-aligned organiser concept gallery"
```

### Task 6: Build, Serve, and Verify the Preview

**Files:**
- Verify: `artifacts/mockup-sandbox/src/components/mockups/gb-organiser-dashboard-concepts/*`
- Verify untouched: `artifacts/peps-anonymous/src/pages/organiser-v2/*`

- [ ] **Step 1: Run the focused contract test fresh**

```bash
cd artifacts/mockup-sandbox
node --experimental-strip-types --test src/components/mockups/gb-organiser-dashboard-concepts/gb-organiser-dashboard-concepts.test.ts
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 2: Run the sandbox production build**

```bash
cd artifacts/mockup-sandbox
MOCKUP_PORT=4174 MOCKUP_BASE_PATH=/ npm run build
```

Expected: Vite exits with code 0 and emits a `GbOrganiserDashboardConcepts-*.js` asset.

- [ ] **Step 3: Verify route registration in the generated component map**

```bash
rg -o '"\./components/mockups/gb-organiser-dashboard-concepts/GbOrganiserDashboardConcepts\.tsx"' dist/assets/index-*.js
```

Expected: one match containing the full component path.

- [ ] **Step 4: Start a localhost preview**

```bash
cd artifacts/mockup-sandbox
MOCKUP_PORT=4174 MOCKUP_BASE_PATH=/ npm run preview -- --host 0.0.0.0
```

Expected: Vite reports `Local: http://localhost:4174/`.

- [ ] **Step 5: Verify the direct preview route**

```bash
curl -sS -I http://localhost:4174/preview/gb-organiser-dashboard-concepts/GbOrganiserDashboardConcepts
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 6: Confirm the production organiser was not changed by this phase**

Record the pre-execution production-organiser status, then compare it with:

```bash
git status --short -- artifacts/peps-anonymous/src/pages/organiser-v2 artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx
```

Expected: no new changes attributable to this mockup plan. Existing user changes, if present before execution, remain untouched.

- [ ] **Step 7: Present the stable preview URL**

Provide:

```text
http://localhost:4174/preview/gb-organiser-dashboard-concepts/GbOrganiserDashboardConcepts
```

Describe Dashboard Native, Operations Focus, and Fulfilment Focus in one line each, and ask the user which concept to refine. Do not propose production implementation until the user selects and approves a concept.

