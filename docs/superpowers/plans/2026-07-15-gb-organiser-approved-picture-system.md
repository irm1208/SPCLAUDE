# GB Organiser Approved Picture System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the five user-approved picture mockups as one coherent production visual system across `/gborganiser-v2` while preserving the existing organiser data, navigation, storage, and workflows.

**Architecture:** Keep `Workspace`, the repository provider, existing domain models, and existing mutations as the behavioural layer. Add a final, route-scoped presentation layer (`approved-workspace.css`) and reshape the five target tab components to expose stable semantic class hooks matching the approved Overview, Orders, Dispatch, Products, and Members pictures. New selectors derive display-only chart, dispatch-lane, inventory, and member-summary data without mutating persisted records.

**Tech Stack:** React 19, TypeScript, Recharts, Lucide React, existing organiser repositories/storage, CSS, Node test runner, Vite.

---

## File map

- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts` — source and visual contract tests for the approved system.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css` — final route-scoped shell and shared responsive rules.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-overview.css` — picture 1 composition.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css` — picture 2 split table/inspector workspace.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-dispatch.css` — picture 3 fulfilment pipeline.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-products.css` — picture 4 inventory/allocation records.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-members.css` — picture 5 directory/profile workspace.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-selectors.ts` — pure display selectors for trends, dispatch lanes, and inventory readiness.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-selectors.test.ts` — selector behaviour tests.
- Modify `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` — import the approved styles after existing organiser styles.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx` — active group-buy switcher and approved navy navigation.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx` — compact breadcrumb, search, notification/profile, and contextual actions.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx` — preserve orchestration while wiring approved actions and page context.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx` — approved command overview.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx` — approved operational table and inspector, retaining current modals/actions.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/DispatchControlDesk.tsx` — approved pipeline while retaining dispatch mutations/log.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx` — approved inventory/allocation presentation while retaining add/edit/import.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/MembersTab.tsx` — approved persistent member directory/inspector.
- Modify `artifacts/peps-anonymous/package.json` — add a focused approved-workspace test command.

### Task 1: Lock the approved visual contract

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write the failing source contract**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

test("approved organiser maps the five pictures to production tabs", () => {
  const contracts = [
    ["./OverviewTabV3.tsx", "approved-command-overview"],
    ["./OrdersTab.tsx", "approved-order-desk"],
    ["./dispatch/DispatchControlDesk.tsx", "approved-dispatch-flow"],
    ["./GbProductsTab.tsx", "approved-inventory-allocation"],
    ["./MembersTab.tsx", "approved-member-hub"],
  ] as const;
  for (const [file, hook] of contracts) assert.match(read(file), new RegExp(hook));
});

test("approved styles preserve Peps tokens and responsive behaviour", () => {
  const css = read("./approved-workspace.css");
  assert.match(css, /#1B3A7A/i);
  assert.match(css, /#2D6BCC/i);
  assert.match(css, /#0F1F38/i);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run the contract and confirm RED**

Run: `node --experimental-strip-types src/pages/organiser-v2/approved-workspace.test.ts`

Expected: FAIL because `approved-workspace.css` and approved class hooks do not exist.

- [ ] **Step 3: Add the focused command**

```json
"test:approved-workspace": "node --experimental-strip-types --test src/pages/organiser-v2/approved-workspace.test.ts src/pages/organiser-v2/approved-selectors.test.ts"
```

### Task 2: Add pure display selectors

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-selectors.test.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-selectors.ts`

- [ ] **Step 1: Write failing tests for trend, lane, and allocation derivation**

```ts
test("buildOrderTrend returns cumulative received and verified totals", () => {
  const points = buildOrderTrend(SAMPLE_ORDERS);
  assert.ok(points.length >= 4);
  assert.equal(points.at(-1)?.received, SAMPLE_ORDERS.length);
  assert.ok((points.at(-1)?.verified ?? 0) <= SAMPLE_ORDERS.length);
});

test("buildDispatchLanes assigns every active and logged order once", () => {
  const state = createInitialDeskState();
  const lanes = buildDispatchLanes(state);
  assert.equal(lanes.flatMap(lane => lane.orders).length, state.orders.length + state.log.length);
});

test("buildProductAllocation never reports allocated above received", () => {
  const row = buildProductAllocation({ id: "p1", soldCount: 9, stock: 3, visible: true });
  assert.ok(row.allocated <= row.received);
});
```

- [ ] **Step 2: Run the selector test and confirm RED**

Run: `node --experimental-strip-types src/pages/organiser-v2/approved-selectors.test.ts`

Expected: FAIL with missing module/exports.

- [ ] **Step 3: Implement pure selectors**

Implement deterministic functions only; do not read local storage, mutate inputs, or use current time without an injected value.

- [ ] **Step 4: Run the selector tests and confirm GREEN**

Run: `node --experimental-strip-types src/pages/organiser-v2/approved-selectors.test.ts`

Expected: PASS.

### Task 3: Apply the approved shared shell

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/DashboardSidebar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] **Step 1: Import the final layer after `peps-native.css`**

```ts
import "./organiser-v2/approved-workspace.css";
import "./organiser-v2/approved-overview.css";
import "./organiser-v2/approved-orders.css";
import "./organiser-v2/approved-dispatch.css";
import "./organiser-v2/approved-products.css";
import "./organiser-v2/approved-members.css";
```

- [ ] **Step 2: Implement shell tokens and density**

Scope every rule beneath `.organiser-v2`. Preserve the 236px sidebar, 64px topbar, `#F4F6F9` canvas, Peps navy gradient, 14px base text, 13px navigation, 27px page titles, shallow borders/shadows, and one primary action per screen.

Add the approved active-group-buy switcher to `DashboardSidebar`. Keep every existing `WorkspaceTabId` reachable. Update `OrganiserTopbar` with labelled search, notification, and profile controls while retaining the existing mobile menu and breadcrumb semantics. Override the late Atlas shell rules that currently force a white sidebar and 58px topbar.

- [ ] **Step 3: Implement responsive shell behaviour**

At 1023px keep the existing drawer. At 767px stack toolbars, convert split inspectors to overlays/stacked panels, and prevent horizontal page overflow. Respect `prefers-reduced-motion`.

- [ ] **Step 4: Run the approved contract**

Expected: style-token assertions pass; tab-hook assertions remain RED until Tasks 4–8.

### Task 4: Build picture 1 — Command Overview

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-overview.css`

- [ ] **Step 1: Replace the equal-card/board composition with the approved hierarchy**

Use `approved-command-overview` as the root. Render the greeting, active group-buy hero, order-target progress, four-metric ribbon, order-momentum chart, and action queue in that order.

- [ ] **Step 2: Render the chart from repository orders**

Use `buildOrderTrend(storedOrders)` with Recharts `ResponsiveContainer`, `AreaChart`, two accessible series, visible legend, axis labels, and a textual summary.

- [ ] **Step 3: Preserve navigation actions**

Action-queue rows continue to call `onGoto("orders")`, `onGoto("dispatch")`, and `onGoto("labtests")`.

- [ ] **Step 4: Run the overview/domain/contract tests**

Run: `pnpm test:overview && pnpm test:domain && pnpm test:approved-workspace`

Expected: PASS for selectors/overview and the Overview class contract.

### Task 5: Build picture 2 — Order Desk

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css`

- [ ] **Step 1: Add inspected-order state**

```ts
const [inspectedOrderId, setInspectedOrderId] = useState<string | null>(highlightId ?? null);
const inspectedOrder = filteredOrders.find(order => order.id === inspectedOrderId) ?? filteredOrders[0] ?? null;
```

- [ ] **Step 2: Render the approved split workspace**

Use `approved-order-desk` as the root. Keep the existing search/filter state and bulk mutations. Render a compact filter toolbar, payment/status summary strip, semantic table with row selection, and a persistent order inspector on desktop.

- [ ] **Step 3: Retain existing operational actions**

Keep mark-paid, mark-dispatched, CSV import/export, add-product, task, proof, edit, and delete flows. The inspector invokes existing edit/status callbacks rather than duplicating mutations.

- [ ] **Step 4: Add responsive order cards**

Below 767px hide the desktop table header and present each semantic row as a labelled card; show the inspector as a full-width panel with a visible close control.

- [ ] **Step 5: Run typecheck and the approved contract**

Run: `pnpm typecheck && pnpm test:approved-workspace`

Expected: PASS.

### Task 6: Build picture 3 — Dispatch Flow

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/dispatch/DispatchControlDesk.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-dispatch.css`

- [ ] **Step 1: Render readiness and carrier summary**

Use `approved-dispatch-flow` as the root. Derive lane counts from `buildDispatchLanes(state)` and keep the existing dispatch-log switch.

- [ ] **Step 2: Render the four-stage pipeline**

Render Awaiting stock, Ready to pack, Label ready, and Handed to carrier as semantic sections. Cards use existing `DispatchOrder`/`DispatchRecord` data and visible text status, not colour alone.

- [ ] **Step 3: Preserve dispatch mutations**

Parcel selection still uses `selectParcelsAndCompute`; order selection still updates `selectedOrderIds`; confirmation still uses `confirmDispatch`; log undo still uses `restoreDispatch`.

- [ ] **Step 4: Run dispatch and approved tests**

Run: `pnpm test:dispatch && pnpm test:approved-workspace`

Expected: PASS.

### Task 7: Build picture 4 — Inventory & Allocation

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/GbProductsTab.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-products.css`

- [ ] **Step 1: Render the approved catalogue summary and filter band**

Use `approved-inventory-allocation` as the root. Preserve search/category filters and add/import actions.

- [ ] **Step 2: Render wide allocation records**

For each existing product render required, ordered, received, allocated, stock progress, and readiness from `buildProductAllocation`. Do not persist the derived display fields.

- [ ] **Step 3: Preserve edit, visibility, delete, CSV, and price-list flows**

Expand/collapse continues to expose the existing edit form; operational buttons call the current handlers.

- [ ] **Step 4: Run selector, storage, typecheck, and approved tests**

Run: `pnpm test:approved-workspace && pnpm typecheck`

Expected: PASS.

### Task 8: Build picture 5 — Member Hub

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/MembersTab.tsx`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-members.css`

- [ ] **Step 1: Keep directory selection persistent**

Default the selected member to the highlighted member or first filtered member; retain search, country, and sorting behaviour.

- [ ] **Step 2: Render the approved split directory/profile view**

Use `approved-member-hub` as the root. Render payment status, member totals, current order, delivery/payment details, organiser note, and recent activity from the existing member/order models.

- [ ] **Step 3: Preserve actions and small-screen access**

Keep message and open-orders actions. At mobile widths stack the profile after the directory and keep selection keyboard operable.

- [ ] **Step 4: Run domain, typecheck, and approved tests**

Run: `pnpm test:domain && pnpm typecheck && pnpm test:approved-workspace`

Expected: PASS.

### Task 9: Full verification and preview

**Files:**
- Verify all files above.

- [ ] **Step 1: Run all organiser tests**

```bash
pnpm test:dispatch
pnpm test:overview
pnpm test:workspace-theme
pnpm test:peps-native-theme
pnpm test:domain
pnpm test:approved-workspace
```

- [ ] **Step 2: Run typecheck and production build**

Run: `pnpm typecheck && pnpm build`

Expected: both exit 0.

- [ ] **Step 3: Start localhost preview and verify the route**

Run: `pnpm serve -- --port 4174`

Verify: `/gborganiser-v2` returns HTTP 200 and the browser console contains no runtime errors.

- [ ] **Step 4: Inspect all five target tabs at desktop and mobile widths**

Compare Overview, Orders, Dispatch, Products, and Members against the approved pictures. Confirm readable typography, no clipping, no horizontal page overflow, visible focus, and status labels that do not rely on colour alone.

## Plan self-review

- The plan covers the five approved pictures, shared shell, responsive states, current workflows, tests, build, and preview.
- No production domain or persisted record is replaced by mockup-only data.
- Display selectors are pure and independently tested.
- Each tab owns its CSS file to allow parallel implementation without edit conflicts.
- No placeholders or deferred implementation tasks remain.
