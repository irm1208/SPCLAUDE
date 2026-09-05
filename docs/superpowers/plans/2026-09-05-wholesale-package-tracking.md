# Wholesale Package Tracking and Order Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show accurate status/history for every direct-wholesale package and open order items in a modal without leaving Logistics Control Room.

**Architecture:** Store a backward-compatible JSONB map keyed by tracking number, dual-write it from the existing refresh worker, and expose it as a parcel array from the authenticated tracking endpoint. Fetch the existing account-owned order detail only when the modal opens.

**Tech Stack:** PostgreSQL, Drizzle ORM, Express 5, React 19, TanStack Query, Radix Dialog, Node test/Vitest.

---

### Task 1: Define the per-package tracking contract

**Files:**
- Modify: `lib/db/src/schema/orders.ts`
- Modify: `artifacts/api-server/src/index.ts`
- Modify: `artifacts/api-server/src/routes/__tests__/wholesale-tracking.test.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-tracking.ts`

- [ ] **Step 1: Write a failing route test**

Add a fixture containing two canonical tracking numbers and a `trackingDetails` map with different statuses and histories. Assert that the response contains two `trackingParcels` entries in canonical-number order and that each entry keeps its own events.

- [ ] **Step 2: Run the focused route test**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/wholesale-tracking.test.ts
```

Expected: failure because `trackingParcels` and `trackingDetails` do not exist.

- [ ] **Step 3: Add the typed nullable JSONB field**

Add a `trackingDetails` field mapped to `tracking_details`, keyed by tracking number, with values containing:

```ts
{
  trackingNumber: string;
  carrier?: string | null;
  status: string | null;
  statusCode?: string | null;
  events: Array<{ date: string; status: string; location: string }>;
  lastChecked: string | null;
}
```

Add `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_details jsonb` beside the existing tracking startup migrations.

- [ ] **Step 4: Return a backward-compatible parcel array**

Select `trackingDetails` in the account tracking route. Build `trackingParcels` from canonical numbers. Use an exact map entry when present. For legacy rows, apply singular status/events only to the first number; return empty events and null status for other unrefreshed numbers. Keep existing singular response fields unchanged.

- [ ] **Step 5: Re-run the route test**

Expected: all focused route tests pass.

### Task 2: Refresh every tracking number independently

**Files:**
- Modify: `artifacts/api-server/src/lib/tracking-auto-refresh.ts`
- Create or modify: `artifacts/api-server/src/lib/tracking-auto-refresh.test.ts`

- [ ] **Step 1: Add failing worker tests**

Cover:

```ts
// two numbers receive distinct statuses and histories
// one failed lookup preserves that number's previous map entry
// a successful lookup updates only its own entry
// compatibility fields remain populated from the canonical primary parcel
```

- [ ] **Step 2: Run the focused worker tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/tracking-auto-refresh.test.ts
```

Expected: failure because the worker currently writes one aggregate result.

- [ ] **Step 3: Implement independent refresh and dual-write**

Canonicalize all numbers, fetch each package independently, merge successful values into the existing map, preserve failed values, stamp each successful package's `lastChecked`, and persist the merged map. Continue setting legacy fields from the canonical primary package.

- [ ] **Step 4: Update stale/terminal eligibility**

Determine refresh eligibility from all current parcel entries: refresh when any canonical number is missing, stale, or non-terminal. Do not let one delivered package suppress updates for another in-transit package.

- [ ] **Step 5: Re-run worker and route tests**

Expected: all focused backend tests pass.

### Task 3: Add client types, fallback helpers, and on-demand order detail

**Files:**
- Modify: `artifacts/peps-anonymous/src/hooks/use-account.ts`
- Modify: `artifacts/peps-anonymous/src/pages/wholesale-tracking-model.ts`
- Modify: `artifacts/peps-anonymous/src/pages/wholesale-tracking-model.test.ts`

- [ ] **Step 1: Add failing model tests**

Assert that parcel normalization preserves canonical order, uses exact per-package data, assigns legacy history only to the first number, returns awaiting-update data for remaining legacy numbers, and sorts history newest first without mutating input.

- [ ] **Step 2: Run the focused model tests**

Run:

```bash
node --experimental-strip-types --test artifacts/peps-anonymous/src/pages/wholesale-tracking-model.test.ts
```

Expected: failure because parcel normalization/history sorting helpers do not exist.

- [ ] **Step 3: Add client contracts and helpers**

Add `WholesaleTrackingParcel`, optional `trackingParcels`, and a reusable line-item-capable account order-detail type. Add `useAccountOrderDetail(orderId, enabled)` with query key `["account", "order", orderId]`, `credentials: "include"`, explicit non-OK errors, and `enabled: enabled && !!orderId`.

- [ ] **Step 4: Implement pure parcel/history helpers**

Normalize server parcels with the legacy fallback rule and return history sorted newest first. Keep invalid-date events stable at the end.

- [ ] **Step 5: Re-run model tests**

Expected: all model tests pass.

### Task 4: Render package histories and the order-items modal

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/WholesaleTracking.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/wholesale-tracking.test.mjs`

- [ ] **Step 1: Add failing page contract tests**

Assert that:

```ts
// Order Details no longer calls setLocation("/account/orders/...")
// a dialog opens from selectedOrderId
// lineItems are rendered in the dialog
// every tracking parcel renders independently
// Previous updates has aria-expanded and controls an identified region
```

- [ ] **Step 2: Run the page contract test**

Run:

```bash
node --test artifacts/peps-anonymous/src/pages/wholesale-tracking.test.mjs
```

Expected: failure on modal and parcel-history assertions.

- [ ] **Step 3: Add per-package rows**

Render one row per normalized parcel. Show latest event/status in the collapsed row. Add an accessible **Previous updates** button only when older events exist; toggle a package-specific history region and list older events newest first.

- [ ] **Step 4: Add the modal**

Use the project's Radix Dialog primitives. Open with the selected order ID, fetch only while open, render product name, quantity, unit price, and line total, and provide loading, retryable error, and empty states. Closing clears the selection.

- [ ] **Step 5: Re-run page and model tests**

Expected: all focused frontend tests pass.

### Task 5: Apply schema and verify the integrated flow

**Files:**
- Verify: `lib/db/src/schema/orders.ts`
- Verify: `artifacts/api-server/src/routes/wholesale-tracking.ts`
- Verify: `artifacts/peps-anonymous/src/pages/WholesaleTracking.tsx`

- [ ] **Step 1: Build shared declarations**

Run:

```bash
pnpm typecheck:libs
```

Expected: exit 0.

- [ ] **Step 2: Apply the development schema**

Run:

```bash
pnpm --filter @workspace/db run push-force
```

Expected: `Changes applied`.

- [ ] **Step 3: Run focused tests and frontend typecheck**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/wholesale-tracking.test.ts src/lib/tracking-auto-refresh.test.ts
node --experimental-strip-types --test artifacts/peps-anonymous/src/pages/wholesale-tracking-model.test.ts
node --test artifacts/peps-anonymous/src/pages/wholesale-tracking.test.mjs
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: all tests and typecheck pass.

- [ ] **Step 4: Restart and inspect**

Restart only `Start application`, confirm clean startup logs, request the customer tracking endpoint with an authenticated development session, and capture the Logistics Control Room. Verify multiple package rows, expandable history, and the order-items modal.

- [ ] **Step 5: Commit the implementation**

```bash
git add lib/db/src/schema/orders.ts artifacts/api-server/src/index.ts artifacts/api-server/src/routes/wholesale-tracking.ts artifacts/api-server/src/routes/__tests__/wholesale-tracking.test.ts artifacts/api-server/src/lib/tracking-auto-refresh.ts artifacts/api-server/src/lib/tracking-auto-refresh.test.ts artifacts/peps-anonymous/src/hooks/use-account.ts artifacts/peps-anonymous/src/pages/wholesale-tracking-model.ts artifacts/peps-anonymous/src/pages/wholesale-tracking-model.test.ts artifacts/peps-anonymous/src/pages/WholesaleTracking.tsx artifacts/peps-anonymous/src/pages/wholesale-tracking.test.mjs
git commit -m "Add per-package wholesale tracking details"
```