# GB Organiser Typography and Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Inter typography system across all live GB Organiser V2 tabs and deliver the action-first mobile Orders workspace, responsive navigation, filter sheet, and accessible detail flows.

**Architecture:** Keep the existing API-backed repositories and workspace routing authoritative. Add pure selectors for operational order state, a presentation-only mobile model, dedicated mobile renderers, and accessible Radix/Vaul overlays; desktop and mobile consume the same normalized records and existing mutations. The final CSS cascade remains scoped to `.organiser-v2`, with shell tokens in `approved-workspace.css`, Orders rules in `approved-orders.css`, and a new last-loaded `approved-tabs.css` for the live legacy-routed tabs.

**Tech Stack:** React 19, TypeScript, TanStack Query, existing order repositories, Node test runner, CSS, Lucide React, Radix Sheet/Dialog, Vaul Drawer, Vite.

---

## Scope and implementation rules

- Work in an isolated git worktree; the current main worktree contains unrelated user changes.
- Do not change API endpoints, database schema, authentication, or repository contracts.
- Do not revive `.atlas-legacy-order-cards`; that renderer is obsolete and hidden by `peps-native.css`.
- Do not treat `GbProductsTab.tsx` or `dispatch/DispatchControlDesk.tsx` as routed production tabs. `Workspace.tsx` routes Products and several other tabs through `GbOrganiser.tsx`, and Dispatch through `DispatchTab` → `AdminDispatch`.
- Do not invent a V2 “Add order” mutation. The approved mobile header action must use an existing contextual handler until the manual-create-order flow is separately authorised.
- No meaningful text may render below 11px. Supported Inter weights are 400, 500, 600, and 700.
- Make a focused commit after each task. Do not push.

## File map

### Create

- `artifacts/peps-anonymous/src/pages/organiser-v2/typography-mobile-contract.test.ts` — exact font-scale and final-cascade contract.
- `artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.ts` — presentation-only mobile views, priority metadata, and action-to-filter mapping.
- `artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.test.ts` — deterministic mobile model coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserMobileNavigation.tsx` — five-destination mobile bottom navigation.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersMobileWorkspace.tsx` — approved attention summary, actions, views, cards, and empty states.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersFilterSurface.tsx` — shared inline desktop/Vaul mobile filter container.
- `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts` — shell, navigation, Orders, drawer, and focus source contracts.
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-tabs.css` — final typography, surfaces, overflow, tablet, and mobile rules for every live tab treatment.
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-responsive.test.ts` — routed-tab and responsive treatment contract.

### Modify

- `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx:18-25` — import the final all-tabs stylesheet last.
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css:4-24, 664-875, 894-1141` — exact type tokens, compact mobile chrome, 44px controls, safe-area and bottom-nav spacing.
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css:1-645` — remove sub-11px declarations and style the approved mobile Orders surfaces.
- `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts:177-329` — replace obsolete type/mobile assertions.
- `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts:65-81` — replace the obsolete 10px Todo expectation.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts` — operational selectors shared by shell badges and mobile Orders.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts` — selector semantics.
- `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.ts` — typed operational filters, order-code search, and live payment status matching.
- `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.test.ts` — filter regressions.
- `artifacts/peps-anonymous/src/pages/organiser-v2/nav.ts:13-90` — one shared mobile destination contract.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx:1-52` — Radix mobile navigation sheet and optional bottom-navigation render prop.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx:41-105` — visible mobile active-group-buy context.
- `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx:59-254` — shared selectors, mobile navigation, and Orders navigation callbacks.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx:1-1171` — mobile view state, mobile renderer, filter surface, and shared quick view.
- `artifacts/peps-anonymous/src/pages/organiser-v2/AtlasUi.tsx:116-228` — keyboard-activatable rows and focus-trapped responsive quick view.
- `artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.ts` — shared-header decision helper.
- `artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.test.ts` — shared-header coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/WorkspaceScreen.tsx:1-30` — consistent routed page header.
- `artifacts/peps-anonymous/package.json` — include new contract tests in `test:approved-workspace`.

---

### Task 1: Lock the approved Inter hierarchy into the final shell and Orders layers

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/typography-mobile-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css:4-24, 664-875, 1054-1124`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css:1-645`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts:177-233`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts:65-81`

- [ ] **Step 1: Write the failing typography contract**

Create `typography-mobile-contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const workspaceCss = read("./approved-workspace.css");
const ordersCss = read("./approved-orders.css");

test("approved organiser exposes the selected Inter type ramp", () => {
  assert.match(workspaceCss, /--approved-type-label:\s*11px\s*;/);
  assert.match(workspaceCss, /--approved-type-meta:\s*12px\s*;/);
  assert.match(workspaceCss, /--approved-type-body:\s*14px\s*;/);
  assert.match(workspaceCss, /--approved-type-control:\s*13px\s*;/);
  assert.match(workspaceCss, /--approved-type-row-title:\s*14px\s*;/);
  assert.match(workspaceCss, /--approved-type-section:\s*16px\s*;/);
  assert.match(workspaceCss, /--approved-type-page-title:\s*29px\s*;/);
  assert.match(workspaceCss, /--approved-type-mobile-page-title:\s*24px\s*;/);
  assert.match(workspaceCss, /--approved-type-metric:\s*24px\s*;/);
  assert.match(workspaceCss, /--approved-type-mobile-metric:\s*21px\s*;/);
});

test("final approved layers contain no literal font size below 11px", () => {
  for (const [name, css] of [["workspace", workspaceCss], ["orders", ordersCss]] as const) {
    const sizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px\s*;/g)]
      .map(match => Number(match[1]));
    assert.equal(
      sizes.filter(size => size < 11).length,
      0,
      `${name} contains a sub-11px font size`,
    );
  }
});

test("final approved layers use only loaded Inter weights", () => {
  const weights = [...`${workspaceCss}\n${ordersCss}`.matchAll(/font-weight:\s*(\d+)\s*;/g)]
    .map(match => Number(match[1]));
  for (const weight of weights) {
    assert.ok([400, 500, 600, 700].includes(weight), `unsupported weight ${weight}`);
  }
});

test("mobile type roles use the approved line heights", () => {
  assert.match(workspaceCss, /--approved-leading-page:\s*34px\s*;/);
  assert.match(workspaceCss, /--approved-leading-mobile-page:\s*29px\s*;/);
  assert.match(workspaceCss, /--approved-leading-body:\s*21px\s*;/);
  assert.match(workspaceCss, /@media\s*\(max-width:\s*767px\)[\s\S]*--approved-type-page-title:\s*var\(--approved-type-mobile-page-title\)/);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/typography-mobile-contract.test.ts
```

Expected: FAIL because the current tokens are `10.5/11.5/13/12.5/28px`, there are `10.5px` declarations, and one final-layer rule uses weight 800.

- [ ] **Step 3: Replace the root typography tokens**

Replace the typography section in `.organiser-v2` with:

```css
  --approved-type-label: 11px;
  --approved-type-micro: var(--approved-type-label);
  --approved-type-meta: 12px;
  --approved-type-body: 14px;
  --approved-type-control: 13px;
  --approved-type-row-title: 14px;
  --approved-type-section: 16px;
  --approved-type-card-title: var(--approved-type-section);
  --approved-type-page-title: 29px;
  --approved-type-mobile-page-title: 24px;
  --approved-type-metric: 24px;
  --approved-type-mobile-metric: 21px;
  --approved-leading-label: 15px;
  --approved-leading-meta: 17px;
  --approved-leading-body: 21px;
  --approved-leading-control: 18px;
  --approved-leading-row-title: 20px;
  --approved-leading-section: 22px;
  --approved-leading-page: 34px;
  --approved-leading-mobile-page: 29px;
  --approved-leading-metric: 28px;
  --approved-leading-mobile-metric: 25px;
```

Update the shared hierarchy rules to use the paired line-height tokens and weights from the spec:

```css
.organiser-v2 .ov2-workspace-screen :where(p, li, dd, td) {
  font-size: var(--approved-type-body);
  font-weight: 400;
  line-height: var(--approved-leading-body);
}

.organiser-v2 .ov2-workspace-screen :where(button, input, select, textarea) {
  font-size: var(--approved-type-control);
  line-height: var(--approved-leading-control);
}

.organiser-v2 .ov2-workspace-screen :where(small, dt, th, label) {
  font-size: var(--approved-type-meta);
  line-height: var(--approved-leading-meta);
}

.organiser-v2 .ov2-workspace-screen :where(h1) {
  font-size: var(--approved-type-page-title);
  font-weight: 600;
  line-height: var(--approved-leading-page);
  letter-spacing: -0.035em;
}

.organiser-v2 .ov2-workspace-screen :where(h2) {
  font-size: var(--approved-type-section);
  font-weight: 600;
  line-height: var(--approved-leading-section);
  letter-spacing: -0.02em;
}

.organiser-v2 .ov2-workspace-screen :where(h3) {
  font-size: var(--approved-type-row-title);
  font-weight: 600;
  line-height: var(--approved-leading-row-title);
}
```

- [ ] **Step 4: Remove final-layer sizes below 11px and unsupported weights**

In `approved-workspace.css` and `approved-orders.css`, replace each literal `10.5px` with `var(--approved-type-label)`, replace label-role `11.5px` with `var(--approved-type-meta)`, replace control-role `12.5px` with `var(--approved-type-control)`, and replace weight `800` with `700`. Do not change icon dimensions.

Add the mobile token override inside the existing 767px media query:

```css
@media (max-width: 767px) {
  .organiser-v2 {
    --approved-type-page-title: var(--approved-type-mobile-page-title);
    --approved-leading-page: var(--approved-leading-mobile-page);
    --approved-type-metric: var(--approved-type-mobile-metric);
    --approved-leading-metric: var(--approved-leading-mobile-metric);
  }
}
```

- [ ] **Step 5: Update the existing exact-size assertions**

Replace the obsolete `10.5/11.5/13/12.5/28px` assertions in `approved-workspace.test.ts` and the 10px Todo assertion in `peps-native-theme.test.ts` with the same token values asserted by `typography-mobile-contract.test.ts`. Change the approved weight set to:

```ts
const approvedWeights = new Set([400, 500, 600, 700]);
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/typography-mobile-contract.test.ts \
  src/pages/organiser-v2/approved-workspace.test.ts \
  src/pages/organiser-v2/peps-native-theme.test.ts
```

Expected: PASS with no sub-11px or unsupported-weight failures.

- [ ] **Step 7: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/typography-mobile-contract.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/peps-native-theme.test.ts
git commit -m "style: establish organiser typography contract"
```

---

### Task 2: Correct live order semantics and centralise operational selectors

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx:12-89, 520-540`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx:35, 76-77`

- [ ] **Step 1: Add failing selector cases**

Add API-like orders to `domain/order-selectors.test.ts` and assert the operational groups:

```ts
test("operational selectors respect live payment and fulfilment semantics", () => {
  const pending = makeOrder("pending", "pending", { total: 65 });
  const review = makeOrder("review", "pending", { paymentStatus: "pending_confirmation", total: 90 });
  const paid = makeOrder("paid", "paid");
  const processing = makeOrder("processing", "processing");
  const shipped = makeOrder("shipped", "shipped");
  const dispatched = makeOrder("dispatched", "dispatched");
  const delivered = makeOrder("delivered", "delivered");
  const cancelled = makeOrder("cancelled", "cancelled", { flagged: { note: "Old note" } });
  const flagged = makeOrder("flagged", "paid", { flagged: { note: "Address missing" } });
  const orders = [pending, review, paid, processing, shipped, dispatched, delivered, cancelled, flagged];

  assert.deepEqual(selectPaymentAttentionOrders(orders).map(order => order.id), ["pending", "review"]);
  assert.deepEqual(selectDispatchReadyOrders(orders).map(order => order.id), ["paid", "processing", "flagged"]);
  assert.deepEqual(selectCompletedOrders(orders).map(order => order.id), ["shipped", "dispatched", "delivered"]);
  assert.deepEqual(selectNeedsActionOrders(orders).map(order => order.id), ["pending", "review", "flagged"]);
  assert.deepEqual(deriveOrderAttentionSummary(orders), {
    paymentCount: 2,
    paymentTotal: 155,
    dispatchReadyCount: 3,
    needsActionCount: 3,
  });
});
```

Use the existing `OrganiserOrder` fixture shape; add this helper above the test:

```ts
function makeOrder(
  id: string,
  status: OrganiserOrder["status"],
  overrides: Partial<OrganiserOrder> = {},
): OrganiserOrder {
  return {
    id,
    code: `10${id.length}`,
    memberUsername: `${id}_user`,
    memberName: id,
    status,
    products: [{ name: "BPC-157", quantity: 1, price: 50 }],
    total: 50,
    paymentMethod: "Revolut",
    country: "United Kingdom",
    createdAt: "2026-07-10T12:00:00Z",
    shippingOption: "Tracked",
    ...overrides,
  };
}
```

- [ ] **Step 2: Add failing filter regressions**

Add to `orders-filter-model.test.ts`:

```ts
test("search includes the member-facing order code", () => {
  const coded = { ...orders[0], id: "internal-id", code: "10482" };
  assert.deepEqual(filterOrders([coded], baseFilters, "10482").map(order => order.id), ["internal-id"]);
});

test("pending confirmation uses the live payment status", () => {
  const review = { ...orders[1], paymentStatus: "pending_confirmation" };
  assert.deepEqual(
    filterOrders([review], { ...baseFilters, statusFilters: ["pending-confirmation"] }, "")
      .map(order => order.id),
    ["ORD-002"],
  );
});

test("operational filters expose dispatch-ready and completed orders", () => {
  const dispatched = { ...orders[0], id: "ORD-004", status: "dispatched" as const };
  assert.deepEqual(
    filterOrders([...orders, dispatched], { ...baseFilters, statusFilters: ["ready-dispatch"] }, "")
      .map(order => order.id),
    ["ORD-001", "ORD-003"],
  );
  assert.deepEqual(
    filterOrders([...orders, dispatched], { ...baseFilters, statusFilters: ["completed"] }, "")
      .map(order => order.id),
    ["ORD-004"],
  );
});
```

- [ ] **Step 3: Run both test files and verify RED**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/domain/order-selectors.test.ts \
  src/pages/organiser-v2/orders-filter-model.test.ts
```

Expected: FAIL because the selectors and operational filter values do not exist, order code is not searched, and pending confirmation currently checks the wrong normalized status.

- [ ] **Step 4: Implement pure operational selectors**

Add to `domain/order-selectors.ts`:

```ts
const COMPLETED_STATUSES = new Set<OrganiserOrder["status"]>([
  "shipped",
  "dispatched",
  "delivered",
]);

export function isPendingPaymentReview(order: OrganiserOrder): boolean {
  return order.paymentStatus?.toLowerCase() === "pending_confirmation";
}

export function selectPaymentAttentionOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => order.status === "pending");
}

export function selectDispatchReadyOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => order.status === "paid" || order.status === "processing");
}

export function selectCompletedOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  return orders.filter(order => COMPLETED_STATUSES.has(order.status));
}

export function selectNeedsActionOrders(
  orders: readonly OrganiserOrder[],
): OrganiserOrder[] {
  const selected = orders.filter(order => (
    order.status !== "cancelled"
    && !COMPLETED_STATUSES.has(order.status)
    && (order.status === "pending" || Boolean(order.flagged))
  ));
  return [...new Map(selected.map(order => [order.id, order])).values()];
}

export function deriveOrderAttentionSummary(orders: readonly OrganiserOrder[]) {
  const paymentOrders = selectPaymentAttentionOrders(orders);
  return {
    paymentCount: paymentOrders.length,
    paymentTotal: paymentOrders.reduce((total, order) => total + order.total, 0),
    dispatchReadyCount: selectDispatchReadyOrders(orders).length,
    needsActionCount: selectNeedsActionOrders(orders).length,
  };
}
```

Keep `countPendingPayments` as a compatibility wrapper around `selectPaymentAttentionOrders`.

- [ ] **Step 5: Type and implement operational filters**

In `orders-filter-model.ts`, add:

```ts
export type OrderStatusFilter =
  | "all"
  | "paid"
  | "unpaid"
  | "pending-confirmation"
  | "ready-dispatch"
  | "completed";

export interface OrderFilterValues {
  statusFilters: OrderStatusFilter[];
  countryFilters: string[];
  paymentMethodFilters: string[];
  orderDateFrom: string;
  orderDateTo: string;
  paymentDateFrom: string;
  paymentDateTo: string;
  sortOrder: OrderSortOrder;
}
```

Add `Ready to dispatch` and `Completed` to `STATUS_LABELS`. Replace the search/status section inside `filterOrders` with:

```ts
const matchesSearch = !query || [
  order.code ?? "",
  order.memberUsername,
  order.memberName,
  order.id,
  order.paymentProof?.value ?? "",
].some(value => value.toLowerCase().includes(query));

const paymentStatus = order.paymentStatus?.toLowerCase();
const isPendingConfirmation = paymentStatus === "pending_confirmation"
  || (!paymentStatus && order.status === "processing");
const isCompleted = ["shipped", "dispatched", "delivered"].includes(order.status);
const isReadyDispatch = order.status === "paid" || order.status === "processing";
const matchesStatus = filters.statusFilters.includes("all")
  || (filters.statusFilters.includes("paid") && order.status === "paid")
  || (filters.statusFilters.includes("unpaid") && order.status === "pending" && !isPendingConfirmation)
  || (filters.statusFilters.includes("pending-confirmation") && isPendingConfirmation)
  || (filters.statusFilters.includes("ready-dispatch") && isReadyDispatch)
  || (filters.statusFilters.includes("completed") && isCompleted);
```

In `OrdersTab.tsx`, import `type OrderStatusFilter`, type the live status state, type the draft toggle parameter, and expose the two operational choices in the existing Filter Studio:

```ts
const STATUS_FILTER_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "pending-confirmation", label: "Pending payment confirmation" },
  { value: "ready-dispatch", label: "Ready to dispatch" },
  { value: "completed", label: "Completed" },
] as const satisfies ReadonlyArray<{ value: OrderStatusFilter; label: string }>;

const [statusFilters, setStatusFilters] = useState<OrderStatusFilter[]>(["all"]);

const toggleDraftStatus = (value: OrderStatusFilter) => {
  setDraftFilters(current => {
    const selected = current.statusFilters.filter(status => status !== "all");
    const next = selected.includes(value)
      ? selected.filter(status => status !== value)
      : [...selected, value];
    return { ...current, statusFilters: next.length > 0 ? next : ["all"] };
  });
};
```

- [ ] **Step 6: Reuse selectors for workspace badges**

Import `deriveOrderAttentionSummary` in `Workspace.tsx` and replace the duplicated calculations with:

```ts
const orderAttention = deriveOrderAttentionSummary(repositoryOrders);
const pendingPayments = orderAttention.paymentCount;
const readyDispatchCount = orderAttention.dispatchReadyCount;
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run the same two test files. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.ts artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx
git commit -m "refactor: derive organiser order queues"
```

---

### Task 3: Build the deterministic mobile Orders presentation model

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.test.ts`

- [ ] **Step 1: Write failing model tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { OrganiserOrder } from "./domain/order.ts";
import {
  buildMobileOrdersModel,
  applyMobileOrderAction,
  selectMobileOrderView,
} from "./orders-mobile-model.ts";
import type { OrderFilterValues } from "./orders-filter-model.ts";

const NOW = Date.parse("2026-07-15T12:00:00Z");

function order(id: string, status: OrganiserOrder["status"], overrides: Partial<OrganiserOrder> = {}): OrganiserOrder {
  return {
    id,
    code: id.replace("order-", "1048"),
    memberUsername: id,
    memberName: id,
    status,
    products: [{ name: "BPC-157", quantity: 2, price: 30 }],
    total: 60,
    paymentMethod: "Revolut",
    country: "United Kingdom",
    createdAt: "2026-07-08T12:00:00Z",
    shippingOption: "Tracked",
    ...overrides,
  };
}

test("mobile model prioritises overdue payment and flagged orders", () => {
  const model = buildMobileOrdersModel([
    order("order-pending", "pending", { total: 65 }),
    order("order-flagged", "paid", { flagged: { note: "Address missing" } }),
    order("order-ready", "processing"),
    order("order-done", "delivered"),
  ], NOW);

  assert.equal(model.summary.paymentCount, 1);
  assert.equal(model.summary.paymentTotal, 65);
  assert.equal(model.summary.dispatchReadyCount, 2);
  assert.deepEqual(model.needsAction.map(item => item.order.id), ["order-pending", "order-flagged"]);
  assert.equal(model.needsAction[0].label, "7 days overdue");
  assert.equal(model.needsAction[1].label, "Address missing");
});

test("mobile views reuse the same normalized orders", () => {
  const pending = order("order-pending", "pending");
  const complete = order("order-complete", "dispatched");
  const model = buildMobileOrdersModel([pending, complete], NOW);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "needs-action").map(item => item.id), [pending.id]);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "all").map(item => item.id), [pending.id, complete.id]);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "completed").map(item => item.id), [complete.id]);
});

test("mobile actions clone filters instead of mutating them", () => {
  const filters: OrderFilterValues = {
    statusFilters: ["all"],
    countryFilters: ["France"],
    paymentMethodFilters: [],
    orderDateFrom: "",
    orderDateTo: "",
    paymentDateFrom: "",
    paymentDateTo: "",
    sortOrder: "newest" as const,
  };
  const next = applyMobileOrderAction(filters, "chase-payment");
  assert.deepEqual(next.statusFilters, ["unpaid", "pending-confirmation"]);
  assert.deepEqual(filters.statusFilters, ["all"]);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --experimental-strip-types --test src/pages/organiser-v2/orders-mobile-model.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the mobile model**

Create `orders-mobile-model.ts`:

```ts
import type { OrganiserOrder } from "./domain/order.ts";
import {
  deriveOrderAttentionSummary,
  selectCompletedOrders,
  selectNeedsActionOrders,
} from "./domain/order-selectors.ts";
import { cloneOrderFilters, type OrderFilterValues } from "./orders-filter-model.ts";

export type MobileOrderView = "needs-action" | "all" | "completed";
export type MobileOrderAction = "chase-payment" | "open-dispatch";

export interface MobileAttentionItem {
  order: OrganiserOrder;
  label: string;
  ageDays: number;
}

export interface MobileOrdersModel {
  summary: ReturnType<typeof deriveOrderAttentionSummary>;
  needsAction: MobileAttentionItem[];
  completed: OrganiserOrder[];
}

function ageInDays(createdAt: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 86_400_000));
}

function attentionLabel(order: OrganiserOrder, ageDays: number): string {
  if (order.flagged?.note) return order.flagged.note;
  if (order.paymentStatus?.toLowerCase() === "pending_confirmation") return "Payment needs review";
  if (ageDays === 1) return "1 day overdue";
  return `${ageDays} days overdue`;
}

export function buildMobileOrdersModel(
  orders: readonly OrganiserOrder[],
  now: number = Date.now(),
): MobileOrdersModel {
  const needsAction = selectNeedsActionOrders(orders)
    .map(order => {
      const ageDays = ageInDays(order.createdAt, now);
      return { order, ageDays, label: attentionLabel(order, ageDays) };
    })
    .sort((left, right) => right.ageDays - left.ageDays || left.order.id.localeCompare(right.order.id));
  return {
    summary: deriveOrderAttentionSummary(orders),
    needsAction,
    completed: selectCompletedOrders(orders),
  };
}

export function selectMobileOrderView(
  model: MobileOrdersModel,
  allOrders: readonly OrganiserOrder[],
  view: MobileOrderView,
): OrganiserOrder[] {
  if (view === "needs-action") return model.needsAction.map(item => item.order);
  if (view === "completed") return [...model.completed];
  return [...allOrders];
}

export function applyMobileOrderAction(
  filters: OrderFilterValues,
  action: MobileOrderAction,
): OrderFilterValues {
  const next = cloneOrderFilters(filters);
  next.statusFilters = action === "chase-payment"
    ? ["unpaid", "pending-confirmation"]
    : ["ready-dispatch"];
  return next;
}
```

- [ ] **Step 4: Run and verify GREEN**

Expected: all mobile model tests PASS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.ts artifacts/peps-anonymous/src/pages/organiser-v2/orders-mobile-model.test.ts
git commit -m "feat: model mobile organiser order queues"
```

---

### Task 4: Replace the custom mobile drawer with an accessible Radix sheet and compact group context

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx:1-52`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx:41-105`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css:894-1052`

- [ ] **Step 1: Write failing shell/topbar contracts**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

test("mobile organiser drawer uses the accessible shared Sheet", () => {
  const shell = read("./OrganiserShell.tsx");
  assert.match(shell, /from\s+["']@\/components\/ui\/sheet["']/);
  assert.match(shell, /<Sheet\s+open=\{mobileOpen\}\s+onOpenChange=\{setMobileOpen\}/);
  assert.match(shell, /<SheetContent[^>]*side=["']left["']/);
  assert.match(shell, /<SheetTitle[^>]*>Organiser navigation<\/SheetTitle>/);
  assert.match(shell, /<SheetDescription/);
});

test("mobile topbar exposes the active group buy", () => {
  const topbar = read("./OrganiserTopbar.tsx");
  assert.match(topbar, /className=["']ov2-mobile-group-context["']/);
  assert.match(topbar, /Active group buy/);
  assert.match(topbar, /\{groupName\}/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --experimental-strip-types --test src/pages/organiser-v2/organiser-mobile-contract.test.ts
```

Expected: FAIL because the shell is custom and the visible mobile group context does not exist.

- [ ] **Step 3: Refactor `OrganiserShell` onto the existing Sheet primitive**

Import `Sheet`, `SheetContent`, `SheetDescription`, and `SheetTitle` from `@/components/ui/sheet`. Keep `mobileNavigation` optional so Setup retains its drawer but receives no workspace bottom bar:

```ts
export default function OrganiserShell({
  sidebar,
  topbar,
  mobileNavigation,
  children,
}: {
  sidebar: (onNavigate: () => void, onCollapse: () => void, collapsed: boolean) => ReactNode;
  topbar: (onOpenMenu: () => void) => ReactNode;
  mobileNavigation?: (onOpenMenu: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const openNavigation = () => setMobileOpen(true);
  const closeNavigation = () => setMobileOpen(false);

  return (
    <div className={collapsed ? "ov2-shell is-sidebar-collapsed" : "ov2-shell"}>
      <a href="#ov2-main-content" className="ov2-skip-link">Skip to main content</a>
      <aside className="ov2-sidebar-desktop" aria-label="Organiser navigation">
        {sidebar(() => undefined, () => setCollapsed(value => !value), collapsed)}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="ov2-sidebar-drawer p-0" aria-label="Mobile organiser navigation">
          <SheetTitle className="sr-only">Organiser navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a destination in the active group buy.
          </SheetDescription>
          {sidebar(closeNavigation, () => undefined, false)}
        </SheetContent>
      </Sheet>
      <div className="ov2-main">
        {topbar(openNavigation)}
        <main id="ov2-main-content" tabIndex={-1}>{children}</main>
        {mobileNavigation?.(openNavigation)}
      </div>
    </div>
  );
}
```

Radix provides focus trapping, Escape handling, opener-focus restoration, and body scroll locking. Remove the old `useEffect`, `drawerRef`, scrim, and `.ov2-mobile-layer` JSX.

- [ ] **Step 4: Add the visible mobile group context**

Insert after the menu/back buttons in `OrganiserTopbar.tsx`:

```tsx
<div className="ov2-mobile-group-context">
  <small>Active group buy</small>
  <strong title={groupName}>{groupName}</strong>
</div>
```

Inside the 767px media query, make this context visible, keep the topbar to one 64px row, hide desktop breadcrumbs/search/share/secondary actions, keep profile and the existing contextual primary action reachable, and raise icon/action controls to 44px.

- [ ] **Step 5: Run shell contract and approved workspace tests**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/organiser-mobile-contract.test.ts \
  src/pages/organiser-v2/approved-workspace.test.ts
```

Expected: PASS. Update obsolete assertions that require `.ov2-mobile-layer` or 38px mobile controls to require Sheet hooks and 44px controls.

- [ ] **Step 6: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserShell.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserTopbar.tsx artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts
git commit -m "refactor: make organiser mobile chrome accessible"
```

---

### Task 5: Add the approved five-destination mobile navigation

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserMobileNavigation.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/nav.ts:13-90`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx:196-244`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts`

- [ ] **Step 1: Extend the failing navigation contract**

```ts
test("mobile bottom navigation exposes the approved destinations", () => {
  const nav = read("./OrganiserMobileNavigation.tsx");
  for (const label of ["Overview", "Orders", "Dispatch", "Members", "More"]) {
    assert.match(nav, new RegExp(`>${label}<`));
  }
  assert.match(nav, /aria-current=\{isActive \? ["']page["']/);
  assert.match(nav, /aria-haspopup=["']dialog["']/);
  assert.match(nav, /onOpenMore/);
});

test("workspace wires the mobile navigation to the existing drawer", () => {
  const workspace = read("./Workspace.tsx");
  assert.match(workspace, /mobileNavigation=\{onOpenMore =>/);
  assert.match(workspace, /onOpenMore=\{onOpenMore\}/);
});
```

- [ ] **Step 2: Run and verify RED**

Expected: FAIL because the component and wiring do not exist.

- [ ] **Step 3: Export one navigation contract from `nav.ts`**

```ts
export const MOBILE_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "dispatch", label: "Dispatch", icon: FileText },
  { id: "members", label: "Members", icon: UserRound },
] as const satisfies ReadonlyArray<Pick<WorkspaceTab, "id" | "label" | "icon">>;
```

- [ ] **Step 4: Create `OrganiserMobileNavigation.tsx`**

```tsx
import { MoreHorizontal } from "lucide-react";
import { MOBILE_WORKSPACE_TABS, type WorkspaceTabId } from "./nav";

export default function OrganiserMobileNavigation({
  activeTab,
  onTabChange,
  onOpenMore,
}: {
  activeTab: WorkspaceTabId;
  onTabChange: (tab: WorkspaceTabId) => void;
  onOpenMore: () => void;
}) {
  const primaryIds = new Set<WorkspaceTabId>(MOBILE_WORKSPACE_TABS.map(tab => tab.id));
  return (
    <nav className="ov2-mobile-bottom-nav" aria-label="Mobile organiser navigation">
      {MOBILE_WORKSPACE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            className={isActive ? "is-active" : undefined}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={!primaryIds.has(activeTab) ? "is-context-active" : undefined}
        aria-haspopup="dialog"
        onClick={onOpenMore}
      >
        <MoreHorizontal aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
```

- [ ] **Step 5: Wire it through `Workspace`**

Import the component and add this render prop to `OrganiserShell`:

```tsx
mobileNavigation={onOpenMore => (
  <OrganiserMobileNavigation
    activeTab={active}
    onTabChange={setActive}
    onOpenMore={onOpenMore}
  />
)}
```

- [ ] **Step 6: Add safe-area and content-clearance CSS**

Default the nav to `display: none`. At `max-width: 767px`, make it a fixed five-column white navigation bar, use `padding-bottom: env(safe-area-inset-bottom)`, set every button to at least 44px, show active state with navy text plus a pale-blue icon surface, and add equivalent bottom padding to `#ov2-main-content` so content is never covered.

- [ ] **Step 7: Run focused tests and verify GREEN**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/organiser-mobile-contract.test.ts \
  src/pages/organiser-v2/approved-workspace.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/OrganiserMobileNavigation.tsx artifacts/peps-anonymous/src/pages/organiser-v2/nav.ts artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.css artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts
git commit -m "feat: add organiser mobile navigation"
```

---

### Task 6: Build the action-first mobile Orders workspace from live normalized data

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersMobileWorkspace.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx:79-1171`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx:151-160`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts`

- [ ] **Step 1: Add failing component contracts**

```ts
test("mobile Orders renders the selected action-first landmarks", () => {
  const mobile = read("./OrdersMobileWorkspace.tsx");
  assert.match(mobile, /17 orders need attention|orders need attention/);
  assert.match(mobile, /Chase payment/);
  assert.match(mobile, /Ready to dispatch/);
  for (const label of ["Needs action", "All orders", "Completed"]) {
    assert.match(mobile, new RegExp(label));
  }
  assert.match(mobile, /order\.code \?\? order\.id/);
  assert.match(mobile, /onOpenOrder\(order\)/);
});

test("Orders keeps desktop and mobile renderers on one repository snapshot", () => {
  const orders = read("./OrdersTab.tsx");
  assert.match(orders, /buildMobileOrdersModel\(orders/);
  assert.match(orders, /className=["']orders-mobile-view["']/);
  assert.match(orders, /className=["']orders-desktop-view["']/);
  assert.match(orders, /onOpenOrder=\{setQuickViewOrder\}/);
});
```

- [ ] **Step 2: Run and verify RED**

Expected: FAIL because the mobile renderer does not exist.

- [ ] **Step 3: Create `OrdersMobileWorkspace.tsx`**

Implement the component with these exact public props:

```ts
export interface OrdersMobileWorkspaceProps {
  model: MobileOrdersModel;
  orders: readonly OrganiserOrder[];
  view: MobileOrderView;
  searchQuery: string;
  activeFilterCount: number;
  onViewChange: (view: MobileOrderView) => void;
  onSearchChange: (query: string) => void;
  onOpenFilters: () => void;
  onChasePayments: () => void;
  onOpenDispatch: () => void;
  onOpenOrder: (order: OrganiserOrder) => void;
}
```

The component must:

- Render an `h1` Orders title and a 44px contextual Dispatch action, not an invented create-order mutation.
- Render a warning summary using `model.summary.needsActionCount`.
- Render two real buttons: Chase payment and Ready to dispatch.
- Render a tablist with `aria-selected` for Needs action, All orders, and Completed.
- Show search and the applied-filter count in All orders.
- Call `selectMobileOrderView(model, orders, view)` for cards.
- Use `order.code ?? order.id`, member identity, formatted total, status/attention reason, product count, and a ChevronRight affordance.
- Use a status message and “View all orders” action when the selected queue is empty.
- Call `onOpenOrder(order)` so the existing quick view remains authoritative.

Use Lucide `AlertTriangle`, `ChevronRight`, `Search`, `SlidersHorizontal`, and `Truck`; use `fmtMoney` from `data.ts` and the model types from `orders-mobile-model.ts`.

- [ ] **Step 4: Integrate it without reviving the stale cards**

In `OrdersTab`:

```ts
const [mobileView, setMobileView] = useState<MobileOrderView>("needs-action");
const mobileModel = useMemo(() => buildMobileOrdersModel(orders), [orders]);

const applyMobileAction = (action: MobileOrderAction) => {
  const next = applyMobileOrderAction(appliedFilters, action);
  setStatusFilters([...next.statusFilters]);
  setDraftFilters(cloneOrderFilters(next));
  setMobileView("all");
};
```

Add an optional `onOpenDispatch` prop to `OrdersTab`; pass `() => setActive("dispatch")` from `Workspace`:

```tsx
export default function OrdersTab({
  selectedGbId,
  highlightId,
  onOpenDispatch,
}: {
  selectedGbId?: string;
  highlightId?: string;
  onOpenDispatch?: () => void;
} = {}) {
```

```tsx
<OrdersTab
  selectedGbId={selectedGbId}
  onOpenDispatch={() => setActive("dispatch")}
/>
```

Render the mobile component before a new `.orders-desktop-view` wrapper:

```tsx
<div className="orders-mobile-view">
  <OrdersMobileWorkspace
    model={mobileModel}
    orders={mobileView === "all" ? filteredOrders : orders}
    view={mobileView}
    searchQuery={searchQuery}
    activeFilterCount={activeFilterCount}
    onViewChange={setMobileView}
    onSearchChange={setSearchQuery}
    onOpenFilters={openFilterStudio}
    onChasePayments={() => applyMobileAction("chase-payment")}
    onOpenDispatch={onOpenDispatch ?? (() => undefined)}
    onOpenOrder={setQuickViewOrder}
  />
</div>
```

Immediately before the existing desktop page-header element that begins the current Orders JSX, add:

```tsx
<div className="orders-desktop-view">
```

Close that wrapper immediately after the existing `AtlasDataTable` block and before `AtlasQuickViewDrawer`:

```tsx
</div>
<AtlasQuickViewDrawer
```

Do not duplicate or move the desktop controls themselves. This exact boundary keeps the existing desktop header, Filter Studio, selection controls, bulk actions, and table in the desktop renderer while leaving the shared quick view and operational modals available to both renderers.

Keep the existing `AtlasQuickViewDrawer` and operational modals outside `.orders-desktop-view` so both responsive renderers can open them.

- [ ] **Step 5: Add responsive Orders CSS**

Default `.orders-mobile-view` to hidden and `.orders-desktop-view` to visible. At `max-width: 767px`, reverse them. Implement the approved white cards, navy actions, semantic warning/success pills, two-column action grid, 44px controls, segmented views, long-username wrapping, and an explicit empty state. Hide `.atlas-legacy-order-cards` at every width.

- [ ] **Step 6: Run mobile model and component contracts**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/orders-mobile-model.test.ts \
  src/pages/organiser-v2/organiser-mobile-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/OrdersMobileWorkspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts
git commit -m "feat: add action-first mobile Orders workspace"
```

---

### Task 7: Render one Filter Studio inline on desktop and as an accessible Vaul sheet on mobile

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersFilterSurface.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx:678-922`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css:536-635`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts`

- [ ] **Step 1: Add failing filter-surface contracts**

```ts
test("mobile Filter Studio uses the shared Vaul drawer and restores focus", () => {
  const surface = read("./OrdersFilterSurface.tsx");
  const orders = read("./OrdersTab.tsx");
  assert.match(surface, /@\/components\/ui\/drawer/);
  assert.match(surface, /<Drawer\s+open=\{open\}/);
  assert.match(surface, /<DrawerTitle\b/);
  assert.match(surface, /<DrawerDescription\b/);
  assert.match(orders, /filterToggleRef/);
  assert.match(orders, /filterToggleRef\.current\?\.focus\(\)/);
});
```

- [ ] **Step 2: Run and verify RED**

Expected: FAIL because Filter Studio is only an inline div.

- [ ] **Step 3: Create `OrdersFilterSurface.tsx`**

```tsx
import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function OrdersFilterSurface({
  open,
  mobile,
  onOpenChange,
  children,
}: {
  open: boolean;
  mobile: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="orders-filter-sheet">
          <DrawerTitle className="sr-only">Filter orders</DrawerTitle>
          <DrawerDescription className="sr-only">
            Refine the order queue and apply the selected filters.
          </DrawerDescription>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }
  if (!open) return null;
  return (
    <div id="orders-filter-studio" className="orders-filter-studio" role="region" aria-label="Filter orders">
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Wrap the existing fieldsets once**

Use `useIsMobile` from `@/hooks/use-mobile`, add `filterToggleRef`, and replace the conditional outer div around the existing header/grid/footer with `OrdersFilterSurface`. Keep the existing draft/apply/reset methods and fieldsets unchanged.

Make every close path restore focus:

```ts
const closeFilterStudio = () => {
  setFilterStudioOpen(false);
  window.requestAnimationFrame(() => filterToggleRef.current?.focus());
};
```

Call it from Cancel, Apply after a valid draft, Escape via Vaul, and `onOpenChange(false)`. Set `ref={filterToggleRef}` on both desktop and mobile filter triggers.

- [ ] **Step 5: Style the mobile bottom sheet**

At `max-width: 767px`, give `.orders-filter-sheet` a maximum height of `min(88dvh, 760px)`, white surface, 18px top radii, safe-area footer padding, internally scrollable fieldset grid, sticky footer, single-column date fields, and 44px actions. Remove the old mobile rule that merely stacks the inline Filter Studio in document flow.

- [ ] **Step 6: Run filter/model/mobile tests**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/orders-filter-model.test.ts \
  src/pages/organiser-v2/organiser-mobile-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/OrdersFilterSurface.tsx artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css artifacts/peps-anonymous/src/pages/organiser-v2/organiser-mobile-contract.test.ts
git commit -m "feat: add mobile order filter sheet"
```

---

### Task 8: Give every routed tab the approved header, typography, surfaces, and responsive floor

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-tabs.css`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-responsive.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx:18-25`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/WorkspaceScreen.tsx:1-30`
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Write failing routed-tab and responsive contracts**

Create `approved-responsive.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { WORKSPACE_GROUPS } from "./nav.ts";
import { WORKSPACE_PAGE_TREATMENT, workspaceUsesSharedHeader } from "./workspace-theme.ts";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const css = read("./approved-tabs.css");
const entry = read("../GbOrganiserV2.tsx");

test("all live destinations retain a treatment and a deliberate header source", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id));
  assert.deepEqual(Object.keys(WORKSPACE_PAGE_TREATMENT).sort(), [...destinations].sort());
  assert.deepEqual(
    destinations.filter(page => !workspaceUsesSharedHeader(page)).sort(),
    ["members", "orders", "overview"],
  );
});

test("final routed-tab stylesheet loads last", () => {
  assert.match(entry, /approved-orders\.css["'];\s*\nimport ["']\.\/organiser-v2\/approved-tabs\.css["'];/);
});

test("every workflow treatment has a final scoped rule", () => {
  for (const treatment of ["dashboard", "board", "table", "composer", "logistics", "insight", "support", "configuration"]) {
    assert.match(css, new RegExp(`data-treatment=["']${treatment}["']`));
  }
});

test("responsive floor prevents page overflow and preserves touch targets", () => {
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /max-width:\s*100%/);
});

test("final routed-tab layer raises legacy text and weights to the approved floor", () => {
  assert.match(css, /\.text-\\\[10px\\\]/);
  assert.match(css, /font-size:\s*var\(--approved-type-label\)\s*!important/);
  assert.match(css, /\.font-black/);
  assert.match(css, /font-weight:\s*700\s*!important/);

  const literalSizes = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px\s*;/g)]
    .map(match => Number(match[1]));
  assert.equal(literalSizes.filter(size => size < 11).length, 0);

  const weights = [...css.matchAll(/font-weight:\s*(\d+)\s*(?:!important)?\s*;/g)]
    .map(match => Number(match[1]));
  for (const weight of weights) {
    assert.ok([400, 500, 600, 700].includes(weight), `unsupported weight ${weight}`);
  }
});
```

- [ ] **Step 2: Add failing shared-header tests**

In `workspace-theme.test.ts`:

```ts
test("only self-headed pages omit the shared page header", () => {
  const destinations = WORKSPACE_GROUPS.flatMap(group => group.tabs.map(tab => tab.id));
  assert.deepEqual(
    destinations.filter(page => !workspaceUsesSharedHeader(page)).sort(),
    ["members", "orders", "overview"],
  );
});
```

- [ ] **Step 3: Run and verify RED**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/approved-responsive.test.ts \
  src/pages/organiser-v2/workspace-theme.test.ts
```

Expected: FAIL because the stylesheet/helper do not exist.

- [ ] **Step 4: Add the shared-header helper and wire `WorkspaceScreen`**

In `workspace-theme.ts`:

```ts
const SELF_HEADED_PAGES = new Set<WorkspaceTabId>(["overview", "orders", "members"]);

export function workspaceUsesSharedHeader(pageId: WorkspaceTabId): boolean {
  return !SELF_HEADED_PAGES.has(pageId);
}
```

Replace the hard-coded `needsOuterHeader` condition in `WorkspaceScreen` with:

```ts
const needsOuterHeader = workspaceUsesSharedHeader(pageId);
```

- [ ] **Step 5: Create the final `approved-tabs.css` layer**

The file must contain these responsibilities, scoped beneath `.organiser-v2 .ov2-workspace-screen[data-page]`:

```css
.organiser-v2 .ov2-workspace-screen[data-page],
.organiser-v2 .ov2-workspace-screen[data-page] > * {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.organiser-v2 .ov2-workspace-screen :where(
  .text-\[7px\], .text-\[8px\], .text-\[9px\], .text-\[9\.5px\],
  .text-\[10px\], .text-\[10\.5px\]
) {
  font-size: var(--approved-type-label) !important;
  line-height: var(--approved-leading-label) !important;
}

.organiser-v2 .ov2-workspace-screen :where(.font-black, .font-extrabold) {
  font-weight: 700 !important;
}

.organiser-v2 .ov2-workspace-screen[data-treatment] :where(
  .rounded-xl.bg-white,
  .rounded-lg.bg-white,
  .bg-white.rounded-xl,
  .bg-white.rounded-lg
) {
  border-color: #D0DAE4 !important;
  border-radius: 13px !important;
  background: #FFFFFF;
  box-shadow: 0 5px 18px rgba(27, 49, 100, 0.05);
}

.organiser-v2 .ov2-workspace-screen[data-treatment="table"] :where(.overflow-x-auto, .atlas-data-table-scroll),
.organiser-v2 .ov2-workspace-screen[data-treatment="logistics"] :where(.overflow-x-auto),
.organiser-v2 .ov2-workspace-screen[data-treatment="insight"] :where(.overflow-x-auto) {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
```

Add explicit sections for all eight treatments. Keep the dashboard section limited to the shared typography/overflow floor so the approved Overview composition remains intact. Preserve the workflow differences elsewhere: board grouping, table row rhythm, composer split, logistics stage controls, insight metrics/charts, support panes, and configuration forms.

At 1023px: change four-column metrics to two columns, let header actions wrap, keep tables in bounded internal scrollers, and collapse wide support/configuration splits.

At 767px: enforce 44px interactive controls (excluding checkbox/radio internals), single-column forms/cards, two-column compact metrics where readable, one-column at 420px, full-width sheets/details, wrapping action headers, safe table scrolling, and no viewport overflow. Include page-specific rules for Todo, Members, Broadcast, Parcels, real Dispatch, QR Codes, Reshippers, Legs, Shipping, P&L, Lab/Testing, Summary, Tickets, Settings, live Products, and Rules.

- [ ] **Step 6: Import the layer last**

After `approved-orders.css` in `GbOrganiserV2.tsx`:

```ts
import "./organiser-v2/approved-tabs.css";
```

- [ ] **Step 7: Register all new source-contract tests**

Set `test:approved-workspace` in `artifacts/peps-anonymous/package.json` to:

```json
"test:approved-workspace": "node --experimental-strip-types --test src/pages/organiser-v2/approved-workspace.test.ts src/pages/organiser-v2/approved-selectors.test.ts src/pages/organiser-v2/typography-mobile-contract.test.ts src/pages/organiser-v2/organiser-mobile-contract.test.ts src/pages/organiser-v2/approved-responsive.test.ts"
```

- [ ] **Step 8: Run the responsive and full approved contracts**

```bash
pnpm test:approved-workspace
node --experimental-strip-types --test src/pages/organiser-v2/workspace-theme.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/approved-tabs.css artifacts/peps-anonymous/src/pages/organiser-v2/approved-responsive.test.ts artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.ts artifacts/peps-anonymous/src/pages/organiser-v2/workspace-theme.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/WorkspaceScreen.tsx artifacts/peps-anonymous/package.json
git commit -m "style: align all organiser tabs responsively"
```

---

### Task 9: Make table rows and quick view keyboard/mobile complete

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/AtlasUi.tsx:116-228`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/atlas-contract.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-tabs.css`

- [ ] **Step 1: Add failing Atlas interaction contracts**

```ts
test("Atlas interactive rows support keyboard activation", () => {
  const source = read("./AtlasUi.tsx");
  assert.match(source, /tabIndex=\{onRowClick \? 0 : undefined\}/);
  assert.match(source, /event\.key === ["']Enter["']/);
  assert.match(source, /event\.key === ["'] ["']/);
});

test("Atlas quick view uses the responsive focus-trapped Sheet", () => {
  const source = read("./AtlasUi.tsx");
  assert.match(source, /@\/components\/ui\/sheet/);
  assert.match(source, /<Sheet\s+open=\{open\}/);
  assert.match(source, /className=["']atlas-quick-view-content/);
});
```

- [ ] **Step 2: Run and verify RED**

```bash
node --experimental-strip-types --test src/pages/organiser-v2/atlas-contract.test.ts
```

- [ ] **Step 3: Add keyboard activation to interactive rows**

On each clickable table row in `AtlasDataTable`, add:

```tsx
tabIndex={onRowClick ? 0 : undefined}
onKeyDown={event => {
  if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  onRowClick(row);
}}
```

Keep checkbox clicks stopped from bubbling.

- [ ] **Step 4: Move quick view to the existing Radix Sheet**

Use controlled `Sheet`, `SheetContent side="right"`, `SheetTitle`, and `SheetDescription`. Preserve the current `AtlasQuickViewDrawer` props and children API, so Orders and Members callers do not change. Apply `atlas-quick-view-content` to the sheet content and retain the existing close, body, and footer sections inside it.

At desktop, keep the current bounded right drawer width. At `max-width: 767px`, make it full width/height with safe-area footer padding. Radix supplies focus trapping, Escape, and trigger-focus restoration.

- [ ] **Step 5: Run Atlas and approved responsive contracts**

```bash
node --experimental-strip-types --test \
  src/pages/organiser-v2/atlas-contract.test.ts \
  src/pages/organiser-v2/approved-responsive.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/AtlasUi.tsx artifacts/peps-anonymous/src/pages/organiser-v2/atlas-contract.test.ts artifacts/peps-anonymous/src/pages/organiser-v2/approved-tabs.css
git commit -m "fix: complete organiser drawer keyboard access"
```

---

### Task 10: Verify the replacement organiser end to end

**Files:**
- Modify only if a verification failure identifies a scoped regression.

- [ ] **Step 1: Run every organiser test**

```bash
cd artifacts/peps-anonymous
rg --files src/pages/organiser-v2 \
  | rg '\.test\.ts$' \
  | sort \
  | xargs node --experimental-strip-types --test
```

Expected: all organiser tests PASS with zero failures.

- [ ] **Step 2: Run the frontend production build**

```bash
node --env-file=../../.env ./node_modules/vite/bin/vite.js build --config vite.config.ts
```

Expected: exit 0. Existing chunk-size or source-map warnings may remain; no new compile error is permitted.

- [ ] **Step 3: Run whitespace validation**

```bash
cd "$(git rev-parse --show-toplevel)"
git diff --check
```

Expected: no output and exit 0.

- [ ] **Step 4: Start the local frontend and API if they are not already running**

Frontend:

```bash
cd artifacts/peps-anonymous
pnpm dev
```

API in a second terminal:

```bash
cd artifacts/api-server
pnpm dev
```

Expected: frontend listens on the workspace `PORT` and API health at `http://localhost:5000/_health` returns 200.

- [ ] **Step 5: Perform authenticated browser checks at four widths**

Use a real approved organiser account and verify `/gborganiser-v2` at 1440px, 1024px, 768px, and 375px:

1. Every routed tab has the approved Inter hierarchy; no meaningful 8–10px text remains.
2. Desktop Orders keeps search, Filter Studio, table, selection, bulk actions, and quick view.
3. Tablet uses the navigation drawer, two-column metrics, bounded table scrolling, and no viewport overflow.
4. Mobile Orders opens on Needs action, shows live payment/dispatch counts, and switches among all three views.
5. Chase payment applies existing filters; Ready to dispatch opens the actual Dispatch tab.
6. Filter Drawer traps focus, closes by Escape/swipe/Apply/Cancel, and restores focus to Filters.
7. Bottom navigation reaches Overview, Orders, Dispatch, Members, and More; More opens the complete existing drawer.
8. Order quick view is full-width on mobile, traps focus, and restores it when closed.
9. Empty, loading, last-good-data error/retry, long username, long status, and zero-count states remain legible.
10. Reduced-motion mode removes nonessential transitions.

- [ ] **Step 6: Run an authenticated API smoke check**

Confirm the organiser group-buy, order, dispatch, ticket, testing, and Todo calls still return expected authenticated responses. This visual phase must not change request paths or payloads.

- [ ] **Step 7: Handle any scoped verification correction as a new TDD task**

If no correction was needed, do not create an empty commit. If a verification failure identifies a regression, stop this task and append a new numbered task to this plan that names the exact failing test, exact source files, RED command, minimal fix, GREEN command, and explicit `git add` paths. Execute that task, then rerun Task 10 from Step 1. This prevents an unknown browser finding from turning into an unreviewed catch-all commit.

---

## Self-review coverage matrix

| Approved requirement | Implemented by |
|---|---|
| Inter 400/500/600/700 and exact 29/24/16/14/13/12/11 scale | Task 1 |
| No meaningful text below 11px | Tasks 1 and 8 |
| Peps surfaces, colours, radii, and restrained shadows | Tasks 1, 6, and 8 |
| Desktop Orders retains the complete table workflow | Task 6 |
| Tablet drawer, two-column metrics, and bounded tables | Tasks 4, 8, and 10 |
| Mobile action summary, payment/dispatch actions, and three views | Tasks 2, 3, and 6 |
| Mobile cards derive from the same live records | Tasks 2, 3, and 6 |
| Mobile Filter Studio bottom sheet and focus restoration | Task 7 |
| Five-destination bottom navigation and More drawer reuse | Tasks 4 and 5 |
| Shared responsive treatment across every routed tab | Task 8 |
| Accessible sheet/drawer, keyboard rows, status text, and 44px targets | Tasks 4, 5, 7, 8, and 9 |
| Loading, empty, error/retry, long content, safe area, reduced motion | Tasks 6, 8, 9, and 10 |
| No API/database/auth contract change | Tasks 2, 6, and 10 |
| Full tests, build, runtime, and browser widths | Task 10 |
