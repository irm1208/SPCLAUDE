# GB Organiser Orders Filter Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Orders page's nested filter dropdowns with the approved collapsed-by-default Filter Studio whose draft choices affect results only after Apply.

**Architecture:** Keep the existing applied React filter states as the sole source used by saved views and the order table. Add a typed draft filter object plus pure filter helpers for previews, chip summaries, validation and category counts. Render the new toolbar and expanded studio inside `OrdersTab.tsx`, and isolate its final Peps styling in a route-scoped stylesheet loaded after the shared approved layer.

**Tech Stack:** React 19, TypeScript, Node test runner, Lucide React, scoped CSS, existing organiser repositories and saved views.

**Workspace constraint:** The organiser implementation is currently untracked in the active workspace, so a new worktree would omit the files this feature modifies. Work in the current workspace, preserve unrelated changes, use `apply_patch`, and do not create implementation commits.

---

## File map

- Create `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.ts` — typed filter values, deterministic filtering, date validation, active-category counts and chip summaries.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.test.ts` — pure regression tests for filtering and presentation helpers.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts` — source contracts for the collapsed studio, draft/apply actions, accessible controls and stylesheet order.
- Modify `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx` — applied/draft state wiring, toolbar, chips and Filter Studio markup while retaining all existing order actions and modals.
- Create `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css` — the Filter Studio's desktop, tablet, mobile, focus and reduced-motion presentation.
- Modify `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx` — load `approved-orders.css` after `approved-workspace.css`.

### Task 1: Lock pure filter behaviour

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.test.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/orders-filter-model.ts`

- [ ] **Step 1: Write failing tests for category counts, chips, dates and preview filtering**

Create `orders-filter-model.test.ts` with representative real-domain orders and these assertions:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import type { OrganiserOrder } from "./domain/order.ts";
import {
  countActiveOrderFilterCategories,
  createOrderFilterChips,
  filterOrders,
  validateOrderFilterDates,
  type OrderFilterValues,
} from "./orders-filter-model.ts";

const baseFilters: OrderFilterValues = {
  statusFilters: ["all"],
  countryFilters: [],
  paymentMethodFilters: [],
  orderDateFrom: "",
  orderDateTo: "",
  paymentDateFrom: "",
  paymentDateTo: "",
  sortOrder: "newest",
};

const orders: OrganiserOrder[] = [
  {
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    products: [{ name: "Tirzepatide 10mg", quantity: 2, price: 60 }],
    total: 120,
    paymentMethod: "USDT",
    country: "United Kingdom",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-11T09:00:00Z",
    shippingOption: "Tracked",
    paymentProof: { type: "txid", value: "0xabc123" },
  },
  {
    id: "ORD-002",
    memberUsername: "sarah_m",
    memberName: "Sarah M.",
    status: "pending",
    products: [{ name: "Semaglutide 5mg", quantity: 1, price: 65 }],
    total: 65,
    paymentMethod: "Revolut",
    country: "France",
    createdAt: "2026-07-12T18:15:00Z",
    shippingOption: "Express",
  },
];

test("active filter count uses categories rather than selected values", () => {
  assert.equal(countActiveOrderFilterCategories({
    ...baseFilters,
    statusFilters: ["paid", "unpaid"],
    countryFilters: ["United Kingdom", "France"],
    orderDateFrom: "2026-07-01",
  }), 3);
});

test("filter chips summarise multiple selections", () => {
  assert.deepEqual(createOrderFilterChips({
    ...baseFilters,
    countryFilters: ["United Kingdom", "France"],
    paymentMethodFilters: ["USDT"],
  }), [
    { id: "country", label: "Country: 2 selected" },
    { id: "payment", label: "Payment: USDT" },
  ]);
});

test("date validation rejects reversed ranges", () => {
  assert.deepEqual(validateOrderFilterDates({
    ...baseFilters,
    orderDateFrom: "2026-07-15",
    orderDateTo: "2026-07-01",
  }), { orderDate: "Order date from must be before order date to." });
});

test("draft preview filters without mutating the input", () => {
  const draft = { ...baseFilters, statusFilters: ["paid"], countryFilters: ["United Kingdom"] };
  const result = filterOrders(orders, draft, "abc123");
  assert.deepEqual(result.map(order => order.id), ["ORD-001"]);
  assert.deepEqual(draft.countryFilters, ["United Kingdom"]);
});

test("to dates include the whole selected calendar day", () => {
  const result = filterOrders(orders, { ...baseFilters, orderDateTo: "2026-07-12" }, "");
  assert.deepEqual(result.map(order => order.id), ["ORD-002", "ORD-001"]);
});
```

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/orders-filter-model.test.ts
```

Expected: FAIL because `orders-filter-model.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure model**

Create `orders-filter-model.ts` with:

```ts
import type { OrganiserOrder } from "./domain/order";

export type OrderSortOrder = "newest" | "oldest";
export type OrderFilterChipId = "status" | "country" | "payment" | "order-date" | "payment-date";

export interface OrderFilterValues {
  statusFilters: string[];
  countryFilters: string[];
  paymentMethodFilters: string[];
  orderDateFrom: string;
  orderDateTo: string;
  paymentDateFrom: string;
  paymentDateTo: string;
  sortOrder: OrderSortOrder;
}

export interface OrderFilterChip {
  id: OrderFilterChipId;
  label: string;
}

export function cloneOrderFilters(filters: OrderFilterValues): OrderFilterValues {
  return {
    ...filters,
    statusFilters: [...filters.statusFilters],
    countryFilters: [...filters.countryFilters],
    paymentMethodFilters: [...filters.paymentMethodFilters],
  };
}

export function countActiveOrderFilterCategories(filters: OrderFilterValues): number {
  return [
    !filters.statusFilters.includes("all") && filters.statusFilters.length > 0,
    filters.countryFilters.length > 0,
    filters.paymentMethodFilters.length > 0,
    Boolean(filters.orderDateFrom || filters.orderDateTo),
    Boolean(filters.paymentDateFrom || filters.paymentDateTo),
  ].filter(Boolean).length;
}

function selectionLabel(prefix: string, values: string[]): string {
  return values.length === 1 ? `${prefix}: ${values[0]}` : `${prefix}: ${values.length} selected`;
}

function rangeLabel(prefix: string, from: string, to: string): string {
  if (from && to) return `${prefix}: ${from} – ${to}`;
  if (from) return `${prefix}: from ${from}`;
  return `${prefix}: to ${to}`;
}

export function createOrderFilterChips(filters: OrderFilterValues): OrderFilterChip[] {
  const chips: OrderFilterChip[] = [];
  if (!filters.statusFilters.includes("all") && filters.statusFilters.length) {
    chips.push({ id: "status", label: selectionLabel("Status", filters.statusFilters) });
  }
  if (filters.countryFilters.length) chips.push({ id: "country", label: selectionLabel("Country", filters.countryFilters) });
  if (filters.paymentMethodFilters.length) chips.push({ id: "payment", label: selectionLabel("Payment", filters.paymentMethodFilters) });
  if (filters.orderDateFrom || filters.orderDateTo) chips.push({ id: "order-date", label: rangeLabel("Order date", filters.orderDateFrom, filters.orderDateTo) });
  if (filters.paymentDateFrom || filters.paymentDateTo) chips.push({ id: "payment-date", label: rangeLabel("Payment date", filters.paymentDateFrom, filters.paymentDateTo) });
  return chips;
}

export function validateOrderFilterDates(filters: OrderFilterValues): Partial<Record<"orderDate" | "paymentDate", string>> {
  const errors: Partial<Record<"orderDate" | "paymentDate", string>> = {};
  if (filters.orderDateFrom && filters.orderDateTo && filters.orderDateFrom > filters.orderDateTo) errors.orderDate = "Order date from must be before order date to.";
  if (filters.paymentDateFrom && filters.paymentDateTo && filters.paymentDateFrom > filters.paymentDateTo) errors.paymentDate = "Payment date from must be before payment date to.";
  return errors;
}

function endOfSelectedDay(value: string): number {
  return new Date(`${value}T23:59:59.999`).getTime();
}

export function filterOrders(orders: OrganiserOrder[], filters: OrderFilterValues, searchQuery: string): OrganiserOrder[] {
  const query = searchQuery.trim().toLowerCase();
  return orders.filter(order => {
    const matchesSearch = !query || [order.memberUsername, order.memberName, order.id, order.paymentProof?.value ?? ""].some(value => value.toLowerCase().includes(query));
    const matchesStatus = filters.statusFilters.includes("all")
      || (filters.statusFilters.includes("paid") && order.status === "paid")
      || (filters.statusFilters.includes("unpaid") && order.status === "pending")
      || (filters.statusFilters.includes("pending-confirmation") && order.status === "processing");
    const matchesCountry = !filters.countryFilters.length || filters.countryFilters.includes(order.country);
    const matchesPayment = !filters.paymentMethodFilters.length || filters.paymentMethodFilters.includes(order.paymentMethod);
    const created = new Date(order.createdAt).getTime();
    const matchesOrderDate = (!filters.orderDateFrom || created >= new Date(`${filters.orderDateFrom}T00:00:00`).getTime())
      && (!filters.orderDateTo || created <= endOfSelectedDay(filters.orderDateTo));
    const paid = order.paidAt ? new Date(order.paidAt).getTime() : null;
    const matchesPaymentDate = (!filters.paymentDateFrom && !filters.paymentDateTo)
      || (paid !== null
        && (!filters.paymentDateFrom || paid >= new Date(`${filters.paymentDateFrom}T00:00:00`).getTime())
        && (!filters.paymentDateTo || paid <= endOfSelectedDay(filters.paymentDateTo)));
    return matchesSearch && matchesStatus && matchesCountry && matchesPayment && matchesOrderDate && matchesPaymentDate;
  }).sort((left, right) => {
    const delta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return filters.sortOrder === "newest" ? delta : -delta;
  });
}
```

- [ ] **Step 4: Run the model tests and verify GREEN**

Run the Step 2 command. Expected: 5 tests pass.

### Task 2: Lock the Filter Studio source contract

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-workspace.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiserV2.tsx`

- [ ] **Step 1: Add a failing source contract**

Append a test that reads `OrdersTab.tsx`, `approved-orders.css` and `GbOrganiserV2.tsx`, then asserts:

```ts
test("approved Order Desk exposes the collapsed draft-and-apply Filter Studio", () => {
  const orders = read("./OrdersTab.tsx");
  const entry = read("../GbOrganiserV2.tsx");
  assert.ok(hasJsxClassName(orders, "approved-order-desk"));
  assert.match(orders, /filterStudioOpen[^\n]*useState\(false\)/);
  assert.match(orders, /aria-expanded=\{filterStudioOpen\}/);
  assert.match(orders, /aria-controls="orders-filter-studio"/);
  assert.match(orders, /id="orders-filter-studio"/);
  assert.match(orders, /Apply filters/);
  assert.match(orders, /Cancel/);
  assert.match(orders, /Reset/);
  assert.match(orders, /cloneOrderFilters/);
  assert.match(orders, /validateOrderFilterDates/);
  const shared = importPosition(entry, "./organiser-v2/approved-workspace.css");
  const ordersCss = importPosition(entry, "./organiser-v2/approved-orders.css");
  assert.ok(ordersCss > shared);
  assert.ok(existsSync(new URL("./approved-orders.css", import.meta.url)));
});
```

- [ ] **Step 2: Run the focused contract and verify RED**

Run:

```bash
node --experimental-strip-types --test \
  --test-name-pattern='approved Order Desk exposes the collapsed draft-and-apply Filter Studio' \
  src/pages/organiser-v2/approved-workspace.test.ts
```

Expected: FAIL because the root hook, Filter Studio markup and stylesheet import do not exist.

- [ ] **Step 3: Add the final stylesheet import**

After `approved-workspace.css`, add:

```ts
import "./organiser-v2/approved-orders.css";
```

Keep the contract RED until the component and stylesheet are implemented.

### Task 3: Implement applied and draft filter state

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`

- [ ] **Step 1: Replace dropdown state with studio state and imports**

Import `useMemo`, `SlidersHorizontal`, and the pure helpers/types. Remove `statusDropdownOpen`, `countryDropdownOpen`, `paymentDropdownOpen` and the old generic dropdown toggle state.

Add:

```ts
const [filterStudioOpen, setFilterStudioOpen] = useState(false);
const [draftFilters, setDraftFilters] = useState<OrderFilterValues>({
  statusFilters: ["all"],
  countryFilters: [],
  paymentMethodFilters: [],
  orderDateFrom: "",
  orderDateTo: "",
  paymentDateFrom: "",
  paymentDateTo: "",
  sortOrder: "newest",
});
```

- [ ] **Step 2: Derive applied filters, chips, preview results and errors**

Create `appliedFilters` with `useMemo` from the existing individual applied states. Derive `filteredOrders`, `draftPreviewOrders`, `activeFilterCount`, `appliedFilterChips` and `draftDateErrors` from the pure helpers. Remove the current duplicated inline `.filter().sort()` block.

- [ ] **Step 3: Add explicit studio actions**

Implement:

```ts
const openFilterStudio = () => {
  setDraftFilters(cloneOrderFilters(appliedFilters));
  setFilterStudioOpen(true);
};

const cancelFilterStudio = () => {
  setDraftFilters(cloneOrderFilters(appliedFilters));
  setFilterStudioOpen(false);
};

const applyDraftFilters = () => {
  if (Object.keys(draftDateErrors).length) return;
  setStatusFilters([...draftFilters.statusFilters]);
  setCountryFilters([...draftFilters.countryFilters]);
  setPaymentMethodFilters([...draftFilters.paymentMethodFilters]);
  setOrderDateFrom(draftFilters.orderDateFrom);
  setOrderDateTo(draftFilters.orderDateTo);
  setPaymentDateFrom(draftFilters.paymentDateFrom);
  setPaymentDateTo(draftFilters.paymentDateTo);
  setSortOrder(draftFilters.sortOrder);
  setFilterStudioOpen(false);
};

const resetDraftFilters = () => setDraftFilters(current => ({
  ...current,
  statusFilters: ["all"],
  countryFilters: [],
  paymentMethodFilters: [],
  orderDateFrom: "",
  orderDateTo: "",
  paymentDateFrom: "",
  paymentDateTo: "",
  sortOrder,
}));
```

Add category-specific applied-chip removal and **Clear all** handlers that update the existing applied states immediately.

- [ ] **Step 4: Synchronise saved views with draft state**

When an active saved view is applied, construct one `nextFilters` object, copy it into the existing applied setters, and also call `setDraftFilters(cloneOrderFilters(nextFilters))`. Creating saved views continues to receive `currentFilters`, which is built only from applied state.

### Task 4: Render the collapsed toolbar and expanded studio

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`

- [ ] **Step 1: Give the component an approved root**

Replace the returned fragment with:

```tsx
<div className="approved-order-desk">
  {/* current Order Desk content and existing modals */}
</div>
```

This also satisfies the already-existing five-picture root contract without altering other Orders workflows.

- [ ] **Step 2: Replace lines 625–820's nested dropdown block**

Render a toolbar with stable class hooks:

```tsx
<section className="orders-filter-workspace" aria-label="Order filters">
  <div className="orders-filter-toolbar">
    <label className="orders-filter-search">
      <span className="sr-only">Search orders</span>
      <Search aria-hidden="true" />
      <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search member, order ID, username or TXID…" />
    </label>
    <button
      type="button"
      className="orders-filter-toggle"
      aria-expanded={filterStudioOpen}
      aria-controls="orders-filter-studio"
      onClick={filterStudioOpen ? cancelFilterStudio : openFilterStudio}
    >
      <SlidersHorizontal aria-hidden="true" />
      Filters
      {activeFilterCount ? <span aria-label={`${activeFilterCount} filter categories applied`}>{activeFilterCount}</span> : null}
      <ChevronDown aria-hidden="true" />
    </button>
    <label className="orders-sort-control">
      <span className="sr-only">Sort orders</span>
      <select value={sortOrder} onChange={event => setSortOrder(event.target.value as OrderSortOrder)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  </div>
  {appliedFilterChips.length ? (
    <div className="orders-applied-filters" aria-label="Applied filters">
      {appliedFilterChips.map(chip => (
        <button type="button" key={chip.id} onClick={() => clearAppliedFilter(chip.id)}>
          {chip.label}<X aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="orders-clear-filters" onClick={clearAllAppliedFilters}>Clear all</button>
      <span>{filteredOrders.length} matching orders</span>
    </div>
  ) : null}
  {/* expanded studio */}
</section>
```

- [ ] **Step 3: Render grouped draft controls**

When `filterStudioOpen`, render `id="orders-filter-studio"`, handle Escape through `onKeyDown`, and include four semantic fieldsets:

- Status checkboxes for paid, unpaid and pending confirmation.
- Country checkboxes from `uniqueCountries`, with a disabled empty row if none exist.
- Payment checkboxes from `uniquePaymentMethods`, with a disabled empty row if none exist.
- Explicitly labelled order/payment date inputs and a draft sort select.

Every change writes only to `draftFilters`. Use the existing `toggleFilter` logic against draft arrays, including the `all` status token.

- [ ] **Step 4: Render the studio footer**

Add an `aria-live="polite"` preview count and these actions:

```tsx
<button type="button" onClick={resetDraftFilters}>Reset</button>
<button type="button" onClick={cancelFilterStudio}>Cancel</button>
<button type="button" onClick={applyDraftFilters} disabled={Object.keys(draftDateErrors).length > 0}>
  Apply filters · {draftPreviewOrders.length} orders
</button>
```

Display inline date errors beside their corresponding date group.

- [ ] **Step 5: Run the focused contract**

Run the Task 2 focused command. Expected: PASS after the stylesheet exists in Task 5.

### Task 5: Style the approved Filter Studio

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css`

- [ ] **Step 1: Add the scoped desktop visual system**

All selectors begin with `.organiser-v2 .approved-order-desk`. Implement:

- a one-row search/filter/sort toolbar;
- 40px controls with 12–12.5px text;
- white connected Filter Studio with `#D0DAE4` borders and shallow shadow;
- four-column desktop group grid;
- 10.5–11px uppercase group labels;
- 12px choice labels and native checkbox accent `#2D6BCC`;
- compact removable chips with blue-soft selected treatment;
- navy Apply button, neutral Cancel/Reset buttons;
- visible `:focus-visible` outlines using `#2D6BCC`.

- [ ] **Step 2: Add tablet and mobile rules**

At `max-width: 1023px`, use two filter columns and allow the toolbar to wrap. At `max-width: 767px`, stack the toolbar and fieldsets, use 44px touch targets, wrap chips, and make the studio footer sticky. Ensure no horizontal page overflow.

- [ ] **Step 3: Add reduced-motion handling**

Under `prefers-reduced-motion: reduce`, remove the studio chevron rotation and panel transition duration.

Accessibility requirements in the same scoped stylesheet and markup include visible focus rings, fieldset/legend grouping, persistent date labels, an `aria-live` preview count, `aria-expanded`/`aria-controls` on the toggle, and 44px mobile touch targets.

- [ ] **Step 4: Run source and whitespace checks**

Run:

```bash
node --experimental-strip-types --test \
  --test-name-pattern='approved Order Desk exposes the collapsed draft-and-apply Filter Studio' \
  src/pages/organiser-v2/approved-workspace.test.ts
git diff --check
git diff --no-index --check /dev/null src/pages/organiser-v2/approved-orders.css; test $? -le 1
```

Expected: focused contract passes and no whitespace errors.

### Task 6: Verify behaviour and integration

**Files:**
- Verify all files above; do not broaden the change.

- [ ] **Step 1: Run pure and approved tests**

```bash
node --experimental-strip-types --test src/pages/organiser-v2/orders-filter-model.test.ts
npm run test:approved-workspace
npm run test:workspace-theme
npm run test:peps-native-theme
```

Expected: the new model and Filter Studio checks pass. If unrelated approved picture hooks remain incomplete, report those exact pre-existing failures separately.

- [ ] **Step 2: Run targeted TypeScript diagnostics**

```bash
npm run typecheck 2>&1 | tee /tmp/gb-orders-filter-typecheck.log
rg 'OrdersTab|orders-filter-model|approved-orders|GbOrganiserV2' /tmp/gb-orders-filter-typecheck.log
```

Expected: no new diagnostics reference the changed Filter Studio files. Existing repository-wide diagnostics may remain and must be reported rather than suppressed.

- [ ] **Step 3: Run the production build**

```bash
node --env-file=../../.env ./node_modules/vite/bin/vite.js build --config vite.config.ts
```

Expected: exit 0. Existing chunk-size warnings are non-blocking.

- [ ] **Step 4: Verify localhost**

```bash
curl -fsS -o /dev/null -w 'status=%{http_code}\n' http://localhost:3002/gborganiser-v2
curl -fsS http://localhost:3002/src/pages/organiser-v2/approved-orders.css | rg 'orders-filter-studio|orders-filter-toolbar'
```

Expected: route returns 200 and the live Vite server serves the final Orders stylesheet.

- [ ] **Step 5: Manual acceptance review**

At desktop and mobile widths verify:

- the studio starts collapsed;
- search remains immediate;
- opening copies applied values into draft controls;
- draft changes do not alter the table;
- Apply changes results and collapses;
- Cancel, collapse and Escape discard draft changes;
- Reset clears only draft filter criteria and preserves applied sort;
- chip removal and Clear all are immediate explicit actions;
- saved views still store applied state only;
- all existing bulk actions, CSV flows, cards, edit modal and proof modal remain reachable.
