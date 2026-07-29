# GB Organiser Atlas Phase 1A Domain Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a tested GB-scoped organiser domain boundary for orders, compatibility storage, and operation events, then migrate Orders and Overview to it without redesigning their current UI or removing existing workflows.

**Architecture:** A normalized order contract sits behind a repository with a stable in-memory snapshot, subscriptions, and explicit mutation descriptors. Prototype mode persists through the existing GB-scoped local-storage keys while accepting both raw legacy JSON and versioned envelopes. Every migrated mutation writes the authoritative order snapshot first, appends a structured prototype event, and then notifies React subscribers; API-backed repositories remain outside this 1A plan.

**Tech Stack:** TypeScript, React 19, `useSyncExternalStore`, browser `localStorage`, Node `node:test`, existing pnpm/Vite toolchain.

---

## Scope Boundary

This plan implements work package **1A — Domain foundation** from the approved programme specification. It intentionally does not install TanStack Table, Recharts v3, XState, React Flow, ZXing, Dexie, PWA, or Sentry. Those libraries belong to the 1B, 1C, Phase 2, Phase 3, and Phase 4 plans.

The completed 1A slice must:

- preserve the current Orders and Overview UI;
- preserve current GB-scoped and legacy local-storage data;
- make repository state reactive across Orders, Overview, and navigation badges;
- append deterministic, GB-scoped operation events for migrated order mutations;
- avoid server or database schema changes;
- leave all other V2 tabs on their current storage helpers until their own migration tasks.

## Execution Preflight

`artifacts/peps-anonymous/src/pages/organiser-v2/` is currently untracked in the shared workspace. A fresh worktree created from `HEAD` would omit the source being modified. Do not create a new worktree or baseline-commit unrelated user files without explicit approval. Inline execution in the current workspace is the safe default for this plan; stage and commit only the exact files named by each task.

## File Structure

### Create

- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.ts` — normalized order types and legacy parsing.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.test.ts` — order normalization coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/sample-orders.ts` — shared sample orders used by repository-backed screens.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.ts` — event contract, deterministic factory, and prototype journal.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.test.ts` — event construction, capping, and GB isolation coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.ts` — repository contract and prototype implementation.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.test.ts` — repository snapshot, persistence, event, and subscription coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.ts` — repository bundle factory.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.test.ts` — bundle composition and GB-scoping coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repository-context.tsx` — React provider and subscription hooks.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts` — Overview mapping and order badge selectors.
- `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts` — selector coverage.
- `artifacts/peps-anonymous/src/pages/organiser-v2/storage.test.ts` — raw, envelope, legacy, and malformed storage coverage.

### Modify

- `artifacts/peps-anonymous/src/pages/organiser-v2/storage.ts` — injectable storage and versioned-envelope compatibility.
- `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx` — create and provide the repository bundle; derive badges reactively.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx` — consume normalized repository orders.
- `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx` — consume repository orders and route all order writes through repository commands.
- `artifacts/peps-anonymous/package.json` — add the focused domain test script.

## Task 1: Normalize the Order Contract

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

```ts
// domain/order.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOrder, normalizeOrders, normalizeOrdersWithIssues } from "./order.ts";

test("normalizeOrder preserves the complete legacy order shape", () => {
  const order = normalizeOrder({
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    products: [{ name: "Semaglutide 5mg", quantity: 2, price: 45 }],
    total: 90,
    paymentMethod: "USDT (TRC20)",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-10T15:00:00Z",
    shippingOption: "Standard Shipping (UK)",
    paymentProof: { type: "txid", value: "0xabc" },
    trackingNumber: "TRACK-1",
    internalNotes: "Use an ice pack",
    flagged: { note: "Express request", dueDate: "2026-07-15", dueTime: "12:00" },
  });

  assert.ok(order);
  assert.equal(order.status, "paid");
  assert.equal(order.products[0].quantity, 2);
  assert.equal(order.flagged?.note, "Express request");
  assert.equal(order.paymentProof?.value, "0xabc");
});

test("normalizeOrder accepts current statuses, maps the legacy payment alias, and rejects unknown statuses", () => {
  const base = {
    id: "ORD-002",
    memberUsername: "member",
    memberName: "Member",
    products: [],
    total: 0,
    paymentMethod: "Manual",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    shippingOption: "Collection",
  };

  assert.equal(normalizeOrder({ ...base, status: "dispatched" })?.status, "dispatched");
  assert.equal(normalizeOrder({ ...base, status: "awaiting_payment" })?.status, "pending");
  assert.equal(normalizeOrder({ ...base, status: "invented" }), null);
});

test("normalizeOrders drops malformed rows without dropping valid rows", () => {
  const result = normalizeOrdersWithIssues([
    {
      id: "ORD-003",
      memberUsername: "anna",
      memberName: "Anna P.",
      status: "processing",
      products: [{ name: "BPC-157", quantity: 2, price: 30 }],
      total: 60,
      paymentMethod: "PayPal",
      country: "Germany",
      createdAt: "2026-07-09T16:20:00Z",
      shippingOption: "EU Tracked",
    },
    { id: "broken" },
  ]);

  assert.deepEqual(result.orders.map(order => order.id), ["ORD-003"]);
  assert.deepEqual(result.issues, [{
    index: 1,
    code: "invalid_order",
    message: "Order record 2 could not be normalized",
  }]);
});

test("normalizeOrders gives valid id-less legacy rows a deterministic identifier", () => {
  const legacyRow = {
    memberUsername: "legacy_member",
    memberName: "Legacy Member",
    status: "awaiting_payment",
    products: [{ name: "BPC-157", quantity: 1, price: 30 }],
    total: 30,
    paymentMethod: "Manual",
    country: "UK",
    createdAt: "2026-07-01T09:00:00Z",
    shippingOption: "Collection",
  };

  const first = normalizeOrders([legacyRow])[0];
  const second = normalizeOrders([legacyRow])[0];
  assert.match(first.id, /^legacy-order-/);
  assert.equal(first.id, second.id);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `domain/order.ts`.

- [ ] **Step 3: Implement the complete normalized order contract**

```ts
// domain/order.ts
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "dispatched",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderProduct {
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentProof {
  type: "txid" | "screenshot";
  value: string;
}

export interface OrderFlag {
  note: string;
  dueDate?: string;
  dueTime?: string;
}

export interface OrganiserOrder {
  id: string;
  memberUsername: string;
  memberName: string;
  status: OrderStatus;
  products: OrderProduct[];
  total: number;
  paymentMethod: string;
  country: string;
  createdAt: string;
  paidAt?: string;
  shippingOption: string;
  paymentProof?: PaymentProof;
  trackingNumber?: string;
  internalNotes?: string;
  flagged?: OrderFlag;
}

export interface OrderNormalizationIssue {
  index: number;
  code: "invalid_order";
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeProducts(value: unknown): OrderProduct[] | null {
  if (!Array.isArray(value)) return null;
  const products: OrderProduct[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const name = requiredString(item, "name");
    const quantity = Number(item["quantity"]);
    const price = Number(item["price"] ?? 0);
    if (!name || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) return null;
    products.push({ name, quantity, price });
  }
  return products;
}

function normalizePaymentProof(value: unknown): PaymentProof | undefined {
  if (!isRecord(value)) return undefined;
  const type = value["type"];
  const proofValue = value["value"];
  if ((type !== "txid" && type !== "screenshot") || typeof proofValue !== "string" || !proofValue) return undefined;
  return { type, value: proofValue };
}

function normalizeFlag(value: unknown): OrderFlag | undefined {
  if (!isRecord(value)) return undefined;
  const note = requiredString(value, "note");
  if (!note) return undefined;
  return {
    note,
    dueDate: optionalString(value, "dueDate"),
    dueTime: optionalString(value, "dueTime"),
  };
}

function normalizeStatus(value: unknown): OrderStatus | null {
  if (value === "awaiting_payment") return "pending";
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

function createLegacyOrderId(record: Record<string, unknown>, index: number): string {
  const seed = [
    requiredString(record, "memberUsername") ?? requiredString(record, "memberName") ?? "member",
    requiredString(record, "createdAt") ?? "unknown-date",
    String(record["total"] ?? ""),
    String(index),
  ].join("|");
  let hash = 2166136261;
  for (let position = 0; position < seed.length; position += 1) {
    hash ^= seed.charCodeAt(position);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy-order-${(hash >>> 0).toString(36)}`;
}

export function normalizeOrder(value: unknown, fallbackId?: string): OrganiserOrder | null {
  if (!isRecord(value)) return null;

  const id = requiredString(value, "id") ?? fallbackId ?? null;
  const memberUsername = requiredString(value, "memberUsername") ?? "unknown";
  const memberName = requiredString(value, "memberName");
  const status = normalizeStatus(value["status"]);
  const products = normalizeProducts(value["products"]);
  const total = Number(value["total"]);
  const paymentMethod = requiredString(value, "paymentMethod") ?? "Manual";
  const country = requiredString(value, "country") ?? "Unknown";
  const createdAt = requiredString(value, "createdAt");
  const shippingOption = requiredString(value, "shippingOption") ?? "Not selected";

  if (
    !id ||
    !memberName ||
    !status ||
    !products ||
    !Number.isFinite(total) ||
    total < 0 ||
    !createdAt
  ) return null;

  return {
    id,
    memberUsername,
    memberName,
    status,
    products,
    total,
    paymentMethod,
    country,
    createdAt,
    paidAt: optionalString(value, "paidAt"),
    shippingOption,
    paymentProof: normalizePaymentProof(value["paymentProof"]),
    trackingNumber: optionalString(value, "trackingNumber"),
    internalNotes: optionalString(value, "internalNotes"),
    flagged: normalizeFlag(value["flagged"]),
  };
}

export function normalizeOrdersWithIssues(value: unknown): {
  orders: OrganiserOrder[];
  issues: OrderNormalizationIssue[];
} {
  if (!Array.isArray(value)) return { orders: [], issues: [] };
  const orders: OrganiserOrder[] = [];
  const issues: OrderNormalizationIssue[] = [];
  value.forEach((item, index) => {
    const fallbackId = isRecord(item) ? createLegacyOrderId(item, index) : undefined;
    const order = normalizeOrder(item, fallbackId);
    if (order) {
      orders.push(order);
    } else {
      issues.push({
        index,
        code: "invalid_order",
        message: `Order record ${index + 1} could not be normalized`,
      });
    }
  });
  return { orders, issues };
}

export function normalizeOrders(value: unknown): OrganiserOrder[] {
  return normalizeOrdersWithIssues(value).orders;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order.test.ts
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the normalized contract**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/order.test.ts
git commit -m "feat: add organiser order domain contract"
```

## Task 2: Make GB Storage Version-Aware and Injectable

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/storage.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/storage.ts`

- [ ] **Step 1: Write the failing storage compatibility tests**

```ts
// storage.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { gbKey, readGb, writeGb } from "./storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("readGb reads the existing raw JSON shape", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), JSON.stringify([{ id: "raw" }]));
  assert.deepEqual(readGb(storage, "gb-1", "orders", []), [{ id: "raw" }]);
});

test("readGb unwraps a versioned envelope", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), JSON.stringify({ schemaVersion: 1, data: [{ id: "wrapped" }] }));
  assert.deepEqual(readGb(storage, "gb-1", "orders", []), [{ id: "wrapped" }]);
});

test("readGb keeps the existing legacy fallback", () => {
  const storage = new MemoryStorage();
  storage.setItem("orders", JSON.stringify([{ id: "legacy" }]));
  assert.deepEqual(readGb(storage, "gb-1", "orders", [], "orders"), [{ id: "legacy" }]);
});

test("writeGb stores a versioned envelope when a schema version is supplied", () => {
  const storage = new MemoryStorage();
  writeGb(storage, "gb-1", "orders", [{ id: "saved" }], 1);
  assert.deepEqual(JSON.parse(storage.getItem(gbKey("gb-1", "orders"))!), {
    schemaVersion: 1,
    data: [{ id: "saved" }],
  });
});

test("readGb returns the fallback for malformed JSON", () => {
  const storage = new MemoryStorage();
  storage.setItem(gbKey("gb-1", "orders"), "not-json");
  assert.deepEqual(readGb(storage, "gb-1", "orders", [{ id: "fallback" }]), [{ id: "fallback" }]);
});
```

- [ ] **Step 2: Run the storage test to verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/storage.test.ts
```

Expected: FAIL because `readGb` and `writeGb` are not exported.

- [ ] **Step 3: Replace `storage.ts` with the compatible implementation**

```ts
// storage.ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StorageEnvelope<T> {
  schemaVersion: number;
  data: T;
}

export function gbKey(gbId: string | undefined, key: string): string {
  return gbId ? `v2:${gbId}:${key}` : `v2:${key}`;
}

function isEnvelope<T>(value: unknown): value is StorageEnvelope<T> {
  return typeof value === "object" && value !== null &&
    typeof (value as { schemaVersion?: unknown }).schemaVersion === "number" &&
    "data" in value;
}

export function readGb<T>(
  storage: StorageLike,
  gbId: string | undefined,
  key: string,
  fallback: T,
  legacyKey?: string,
): T {
  const raw = storage.getItem(gbKey(gbId, key)) ?? (legacyKey ? storage.getItem(legacyKey) : null);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isEnvelope<T>(parsed) ? parsed.data : parsed as T;
  } catch {
    return fallback;
  }
}

export function writeGb<T>(
  storage: StorageLike,
  gbId: string | undefined,
  key: string,
  value: T,
  schemaVersion?: number,
): void {
  const stored = schemaVersion == null ? value : { schemaVersion, data: value };
  storage.setItem(gbKey(gbId, key), JSON.stringify(stored));
}

export function loadGb<T>(gbId: string | undefined, key: string, fallback: T, legacyKey?: string): T {
  return readGb(window.localStorage, gbId, key, fallback, legacyKey);
}

export function saveGb<T>(gbId: string | undefined, key: string, value: T): void {
  writeGb(window.localStorage, gbId, key, value);
}
```

- [ ] **Step 4: Run storage and existing focused tests**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/storage.test.ts
pnpm run test:overview
pnpm run test:dispatch
```

Expected: storage has 5 passing tests; Overview and Dispatch remain green.

- [ ] **Step 5: Commit the storage boundary**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/storage.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/storage.test.ts
git commit -m "refactor: add versioned organiser storage boundary"
```

## Task 3: Add the Shared Sample Orders

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/sample-orders.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`

- [ ] **Step 1: Create the shared sample-order module**

Move the four existing `SAMPLE_ORDERS` records from `OrdersTab.tsx` into this exact export, retaining every existing field and value:

```ts
// domain/sample-orders.ts
import type { OrganiserOrder } from "./order.ts";

export const SAMPLE_ORDERS: OrganiserOrder[] = [
  {
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    products: [
      { name: "Semaglutide 5mg", quantity: 2, price: 45 },
      { name: "BPC-157 5mg", quantity: 1, price: 30 },
    ],
    total: 120,
    paymentMethod: "USDT (TRC20)",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-10T15:00:00Z",
    shippingOption: "Standard Shipping (UK)",
    paymentProof: {
      type: "txid",
      value: "0x9a8f7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
    },
    trackingNumber: "1Z999AA10123456784",
    internalNotes: "Customer requested express delivery. Package includes ice pack.",
  },
  {
    id: "ORD-002",
    memberUsername: "sarah_m",
    memberName: "Sarah M.",
    status: "pending",
    products: [{ name: "Tirzepatide 10mg", quantity: 1, price: 65 }],
    total: 65,
    paymentMethod: "Revolut",
    country: "France",
    createdAt: "2026-07-11T09:15:00Z",
    shippingOption: "EU Tracked",
  },
  {
    id: "ORD-003",
    memberUsername: "mike_fitness",
    memberName: "Mike F.",
    status: "shipped",
    products: [{ name: "Semaglutide 5mg", quantity: 3, price: 45 }],
    total: 135,
    paymentMethod: "USDT (ERC20)",
    country: "UK",
    createdAt: "2026-07-08T11:00:00Z",
    paidAt: "2026-07-08T12:30:00Z",
    shippingOption: "Standard Shipping (UK)",
    paymentProof: {
      type: "txid",
      value: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
  },
  {
    id: "ORD-004",
    memberUsername: "anna_p",
    memberName: "Anna P.",
    status: "processing",
    products: [{ name: "BPC-157 5mg", quantity: 2, price: 30 }],
    total: 60,
    paymentMethod: "PayPal",
    country: "Germany",
    createdAt: "2026-07-09T16:20:00Z",
    paidAt: "2026-07-09T17:00:00Z",
    shippingOption: "EU Tracked",
    paymentProof: { type: "screenshot", value: "/uploads/payment-proof-004.png" },
  },
];
```

- [ ] **Step 2: Replace the private order type and fixtures in `OrdersTab.tsx`**

Add these imports after the existing local imports:

```ts
import type { OrganiserOrder as Order } from "./domain/order";
import { SAMPLE_ORDERS } from "./domain/sample-orders";
```

Delete the old `interface Order` and old `const SAMPLE_ORDERS`. Do not change component behaviour in this task.

- [ ] **Step 3: Add presentation coverage for the existing dispatched action**

Add the missing `dispatched` entry to `STATUS_CONFIG` so repository-backed dispatched orders can render safely:

```ts
const STATUS_CONFIG = {
  pending: { label: "Pending Payment", color: "#D97706", bg: "rgba(217,119,6,0.10)", icon: Clock },
  paid: { label: "Paid", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)", icon: CheckCircle2 },
  processing: { label: "Processing", color: "#4A6CF7", bg: "rgba(74,108,247,0.10)", icon: Package },
  shipped: { label: "Shipped", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)", icon: Package },
  delivered: { label: "Delivered", color: "#16A34A", bg: "rgba(22,163,74,0.10)", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.10)", icon: XCircle },
  dispatched: { label: "Dispatched", color: "#1B3A7A", bg: "rgba(27,58,122,0.10)", icon: Truck },
};
```

Add the missing edit-menu option immediately after `Shipped`:

```tsx
<option value="shipped">Shipped</option>
<option value="dispatched">Dispatched</option>
<option value="delivered">Delivered</option>
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit the shared fixtures**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/sample-orders.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx
git commit -m "refactor: share organiser sample orders"
```

## Task 4: Add the Prototype Operation Event Journal

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.test.ts`

- [ ] **Step 1: Write the failing event-journal tests**

```ts
// domain/events.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createEventFactory, createPrototypeEventJournal } from "./events.ts";
import { gbKey } from "../storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("event factory creates deterministic scoped events", () => {
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: () => "evt-1",
  });
  const event = createEvent({
    groupBuyId: "gb-1",
    type: "order.bulk_paid",
    entityType: "order",
    entityIds: ["ORD-001", "ORD-002"],
    actorId: "organiser",
    summary: "Marked 2 orders as paid",
    correlationId: "bulk-1",
    causationId: "command-1",
    idempotencyKey: "gb-1:bulk-paid:command-1",
  });

  assert.equal(event.id, "evt-1");
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.occurredAt, "2026-07-14T12:00:00.000Z");
  assert.deepEqual(event.entityIds, ["ORD-001", "ORD-002"]);
  assert.equal(event.correlationId, "bulk-1");
  assert.equal(event.causationId, "command-1");
  assert.equal(event.idempotencyKey, "gb-1:bulk-paid:command-1");
});

test("prototype journal is GB scoped and newest first", () => {
  const storage = new MemoryStorage();
  const journal = createPrototypeEventJournal({ storage, maxEvents: 2 });
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: (() => { let value = 0; return () => `evt-${++value}`; })(),
  });

  for (const summary of ["one", "two", "three"]) {
    journal.append(createEvent({
      groupBuyId: "gb-1",
      type: "order.updated",
      entityType: "order",
      entityIds: ["ORD-001"],
      actorId: "organiser",
      summary,
    }));
  }

  assert.deepEqual(journal.list("gb-1").map(event => event.summary), ["three", "two"]);
  assert.deepEqual(journal.list("gb-2"), []);
  assert.ok(storage.getItem(gbKey("gb-1", "operationEvents")));
});
```

- [ ] **Step 2: Run the event test to verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/events.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `domain/events.ts`.

- [ ] **Step 3: Implement the event contract, factory, and journal**

```ts
// domain/events.ts
import { readGb, writeGb, type StorageLike } from "../storage.ts";

export type OrganiserEventType =
  | "order.updated"
  | "order.product_added"
  | "order.task_linked"
  | "order.bulk_paid"
  | "order.bulk_dispatched"
  | "order.tracking_imported";

export interface OrganiserEvent {
  id: string;
  schemaVersion: 1;
  groupBuyId: string;
  type: OrganiserEventType;
  entityType: "order";
  entityIds: string[];
  actorType: "organiser" | "system";
  actorId: string;
  summary: string;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export interface EventInput {
  groupBuyId: string;
  type: OrganiserEventType;
  entityType: "order";
  entityIds: string[];
  actorId: string;
  actorType?: "organiser" | "system";
  summary: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export function createEventFactory(deps: { now?: () => string; id?: () => string } = {}) {
  const now = deps.now ?? (() => new Date().toISOString());
  const id = deps.id ?? (() => crypto.randomUUID());
  return (input: EventInput): OrganiserEvent => ({
    id: id(),
    schemaVersion: 1,
    groupBuyId: input.groupBuyId,
    type: input.type,
    entityType: input.entityType,
    entityIds: [...input.entityIds],
    actorType: input.actorType ?? "organiser",
    actorId: input.actorId,
    summary: input.summary,
    occurredAt: now(),
    correlationId: input.correlationId,
    causationId: input.causationId,
    idempotencyKey: input.idempotencyKey,
  });
}

export interface EventJournal {
  append(event: OrganiserEvent): void;
  list(groupBuyId: string): readonly OrganiserEvent[];
}

export function createPrototypeEventJournal({
  storage,
  maxEvents = 500,
}: {
  storage: StorageLike;
  maxEvents?: number;
}): EventJournal {
  return {
    append(event) {
      const current = readGb<OrganiserEvent[]>(storage, event.groupBuyId, "operationEvents", []);
      writeGb(storage, event.groupBuyId, "operationEvents", [event, ...current].slice(0, maxEvents), 1);
    },
    list(groupBuyId) {
      return readGb<OrganiserEvent[]>(storage, groupBuyId, "operationEvents", []);
    },
  };
}
```

- [ ] **Step 4: Run the event tests**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/events.test.ts
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Commit the event journal**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/events.test.ts
git commit -m "feat: add organiser operation event journal"
```

## Task 5: Add the Prototype Order Repository

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
// domain/order-repository.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createEventFactory, createPrototypeEventJournal } from "./events.ts";
import { createPrototypeOrderRepository } from "./order-repository.ts";
import { gbKey } from "../storage.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const legacyOrder = {
  id: "ORD-001",
  memberUsername: "john_doe",
  memberName: "John D.",
  status: "pending",
  products: [{ name: "BPC-157", quantity: 1, price: 30 }],
  total: 30,
  paymentMethod: "Manual",
  country: "UK",
  createdAt: "2026-07-10T14:30:00Z",
  shippingOption: "UK Standard",
};

function setup() {
  const storage = new MemoryStorage();
  storage.setItem("orders", JSON.stringify([legacyOrder, { id: "broken" }]));
  const journal = createPrototypeEventJournal({ storage });
  const createEvent = createEventFactory({
    now: () => "2026-07-14T12:00:00.000Z",
    id: () => "evt-1",
  });
  const repository = createPrototypeOrderRepository({
    groupBuyId: "gb-1",
    storage,
    fallback: [],
    journal,
    createEvent,
  });
  return { storage, journal, repository };
}

test("repository normalizes the legacy fallback into its initial snapshot", () => {
  const { repository } = setup();
  assert.deepEqual(repository.getSnapshot().map(order => order.id), ["ORD-001"]);
  assert.deepEqual(repository.getReadIssues().map(issue => issue.index), [1]);
});

test("updateMany persists, emits one event, and notifies once", () => {
  const { storage, journal, repository } = setup();
  let notifications = 0;
  const unsubscribe = repository.subscribe(() => { notifications += 1; });

  repository.updateMany(
    ["ORD-001"],
    order => ({ ...order, status: "paid", paidAt: "2026-07-14T12:00:00.000Z" }),
    {
      type: "order.bulk_paid",
      actorId: "organiser",
      summary: "Marked 1 order as paid",
      correlationId: "bulk-1",
      causationId: "command-1",
      idempotencyKey: "gb-1:bulk-paid:command-1",
    },
  );
  unsubscribe();

  assert.equal(repository.getSnapshot()[0].status, "paid");
  assert.equal(notifications, 1);
  const event = journal.list("gb-1")[0];
  assert.equal(event.type, "order.bulk_paid");
  assert.equal(event.correlationId, "bulk-1");
  assert.equal(event.causationId, "command-1");
  assert.equal(event.idempotencyKey, "gb-1:bulk-paid:command-1");
  const stored = JSON.parse(storage.getItem(gbKey("gb-1", "orders"))!);
  assert.equal(stored.schemaVersion, 1);
  assert.equal(stored.data[0].status, "paid");
});

test("replaceOne updates one order and emits order.updated", () => {
  const { journal, repository } = setup();
  const original = repository.getSnapshot()[0];
  repository.replaceOne(
    { ...original, trackingNumber: "TRACK-2", internalNotes: "Updated" },
    { type: "order.updated", actorId: "organiser", summary: "Updated ORD-001" },
  );
  assert.equal(repository.getSnapshot()[0].trackingNumber, "TRACK-2");
  assert.equal(journal.list("gb-1")[0].type, "order.updated");
});

test("a mutation with no matching ids performs no write or event", () => {
  const { journal, repository } = setup();
  const before = repository.getSnapshot();
  const after = repository.updateMany(
    ["missing"],
    order => ({ ...order, status: "paid" }),
    { type: "order.bulk_paid", actorId: "organiser", summary: "No-op" },
  );
  assert.equal(after, before);
  assert.deepEqual(journal.list("gb-1"), []);
});
```

- [ ] **Step 2: Run the repository tests to verify they fail**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order-repository.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `domain/order-repository.ts`.

- [ ] **Step 3: Implement the repository**

```ts
// domain/order-repository.ts
import { normalizeOrdersWithIssues, type OrganiserOrder, type OrderNormalizationIssue } from "./order.ts";
import type { EventInput, EventJournal, OrganiserEvent, OrganiserEventType } from "./events.ts";
import { readGb, writeGb, type StorageLike } from "../storage.ts";

export interface OrderChange {
  type: OrganiserEventType;
  actorId: string;
  actorType?: "organiser" | "system";
  summary: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

export interface OrderRepository {
  getSnapshot(): readonly OrganiserOrder[];
  getReadIssues(): readonly OrderNormalizationIssue[];
  subscribe(listener: () => void): () => void;
  replaceOne(order: OrganiserOrder, change: OrderChange): readonly OrganiserOrder[];
  updateMany(
    ids: readonly string[],
    update: (order: OrganiserOrder) => OrganiserOrder,
    change: OrderChange,
  ): readonly OrganiserOrder[];
}

export function createPrototypeOrderRepository({
  groupBuyId,
  storage,
  fallback,
  journal,
  createEvent,
}: {
  groupBuyId: string;
  storage: StorageLike;
  fallback: readonly OrganiserOrder[];
  journal: EventJournal;
  createEvent: (input: EventInput) => OrganiserEvent;
}): OrderRepository {
  const normalized = normalizeOrdersWithIssues(
    readGb(storage, groupBuyId, "orders", fallback, "orders"),
  );
  let current: readonly OrganiserOrder[] = normalized.orders;
  const readIssues: readonly OrderNormalizationIssue[] = normalized.issues;
  const listeners = new Set<() => void>();

  function commit(next: readonly OrganiserOrder[], entityIds: string[], change: OrderChange) {
    writeGb(storage, groupBuyId, "orders", next, 1);
    journal.append(createEvent({
      groupBuyId,
      type: change.type,
      entityType: "order",
      entityIds,
      actorId: change.actorId,
      actorType: change.actorType,
      summary: change.summary,
      correlationId: change.correlationId,
      causationId: change.causationId,
      idempotencyKey: change.idempotencyKey,
    }));
    current = next;
    listeners.forEach(listener => listener());
    return current;
  }

  return {
    getSnapshot: () => current,
    getReadIssues: () => readIssues,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replaceOne(order, change) {
      const index = current.findIndex(item => item.id === order.id);
      if (index < 0) return current;
      const next = [...current];
      next[index] = order;
      return commit(next, [order.id], change);
    },
    updateMany(ids, update, change) {
      const selected = new Set(ids);
      const changedIds: string[] = [];
      const next = current.map(order => {
        if (!selected.has(order.id)) return order;
        changedIds.push(order.id);
        return update(order);
      });
      return changedIds.length ? commit(next, changedIds, change) : current;
    },
  };
}
```

- [ ] **Step 4: Run all domain tests**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order.test.ts \
  src/pages/organiser-v2/domain/events.test.ts \
  src/pages/organiser-v2/domain/order-repository.test.ts
```

Expected: 10 tests pass, 0 fail.

- [ ] **Step 5: Commit the repository**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-repository.test.ts
git commit -m "feat: add prototype organiser order repository"
```

## Task 6: Add Repository Composition and React Hooks

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.test.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/repository-context.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx`

- [ ] **Step 1: Write the failing repository-bundle test**

```ts
// domain/repositories.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createPrototypeOrganiserRepositories } from "./repositories.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("repository bundle composes GB-scoped sample orders and events", () => {
  const storage = new MemoryStorage();
  const repositories = createPrototypeOrganiserRepositories({
    groupBuyId: "gb-1",
    storage,
  });

  assert.deepEqual(
    repositories.orders.getSnapshot().map(order => order.id),
    ["ORD-001", "ORD-002", "ORD-003", "ORD-004"],
  );

  repositories.orders.updateMany(
    ["ORD-002"],
    order => ({ ...order, status: "paid" }),
    { type: "order.bulk_paid", actorId: "organiser", summary: "Marked ORD-002 paid" },
  );

  assert.equal(repositories.events.list("gb-1")[0].type, "order.bulk_paid");
  assert.deepEqual(repositories.events.list("gb-2"), []);
});
```

- [ ] **Step 2: Run the bundle test to verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/repositories.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `domain/repositories.ts`.

- [ ] **Step 3: Create the repository bundle factory**

```ts
// domain/repositories.ts
import { createEventFactory, createPrototypeEventJournal, type EventJournal } from "./events.ts";
import { createPrototypeOrderRepository, type OrderRepository } from "./order-repository.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";
import type { StorageLike } from "../storage.ts";

export interface OrganiserRepositories {
  orders: OrderRepository;
  events: EventJournal;
}

export function createPrototypeOrganiserRepositories({
  groupBuyId,
  storage = window.localStorage,
}: {
  groupBuyId: string;
  storage?: StorageLike;
}): OrganiserRepositories {
  const events = createPrototypeEventJournal({ storage });
  return {
    events,
    orders: createPrototypeOrderRepository({
      groupBuyId,
      storage,
      fallback: SAMPLE_ORDERS,
      journal: events,
      createEvent: createEventFactory(),
    }),
  };
}
```

- [ ] **Step 4: Create the provider and reactive order hook**

```tsx
// domain/repository-context.tsx
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { OrderRepository } from "./order-repository.ts";
import type { OrganiserRepositories } from "./repositories.ts";

const RepositoryContext = createContext<OrganiserRepositories | null>(null);

export function OrganiserRepositoryProvider({
  value,
  children,
}: {
  value: OrganiserRepositories;
  children: ReactNode;
}) {
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useOrganiserRepositories(): OrganiserRepositories {
  const repositories = useContext(RepositoryContext);
  if (!repositories) throw new Error("OrganiserRepositoryProvider is required");
  return repositories;
}

export function useOrderRepository(): OrderRepository {
  return useOrganiserRepositories().orders;
}

export function useOrders() {
  const repository = useOrderRepository();
  return useSyncExternalStore(repository.subscribe, repository.getSnapshot, repository.getSnapshot);
}
```

- [ ] **Step 5: Wire the repository bundle into `Workspace.tsx`**

Add `useMemo` to the React import and add these imports:

```tsx
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPrototypeOrganiserRepositories } from "./domain/repositories";
import { OrganiserRepositoryProvider } from "./domain/repository-context";
```

Immediately after `const gb = SAMPLE_GBS[0];`, create one stable bundle and subscribe for badge calculations:

```tsx
const repositories = useMemo(
  () => createPrototypeOrganiserRepositories({ groupBuyId: gb.id }),
  [gb.id],
);
const repositoryOrders = useSyncExternalStore(
  repositories.orders.subscribe,
  repositories.orders.getSnapshot,
  repositories.orders.getSnapshot,
);
```

Delete the existing order `loadGb` call and derive pending payments from `repositoryOrders`:

```tsx
const pendingPayments = repositoryOrders.filter(
  order => order.status === "pending",
).length;
```

Wrap the existing fragment returned by `Workspace` in the provider:

```tsx
return (
  <OrganiserRepositoryProvider value={repositories}>
    <OrganiserShell
      sidebar={(onNavigate, onCollapse, collapsed) => (
        <DashboardSidebar
          activeTab={active}
          onTabChange={setActive}
          gbName={gb.name}
          userName="Organiser"
          badges={badges}
          onNavigate={onNavigate}
          onSwitchMode={onModeChange}
          onCollapse={onCollapse}
          collapsed={collapsed}
        />
      )}
      topbar={onOpenMenu => (
        <OrganiserTopbar
          groupName={gb.name}
          pageLabel={pageMeta.title}
          onOpenMenu={onOpenMenu}
          onSearch={() => setSearchOpen(true)}
          onBack={() => setActive("overview")}
          onShare={handleShare}
          secondaryActions={(
            <button type="button" className="ov2-secondary-button" onClick={onModeChange}>
              <FolderCog aria-hidden="true" /> Manage
            </button>
          )}
          primaryAction={active === "overview" ? { label: "Create order", onClick: () => setActive("orders") } : undefined}
        />
      )}
    >
      <WorkspaceScreen pageId={active}>
        {shareCopied ? <div className="ov2-copy-toast" role="status">Workspace link copied</div> : null}
        {activeContent}
      </WorkspaceScreen>
    </OrganiserShell>

    <GlobalSearch
      selectedGbId={gb.id}
      onNavigate={handleNavigate}
      open={searchOpen}
      onClose={() => setSearchOpen(false)}
    />
  </OrganiserRepositoryProvider>
);
```

Do not retain the extra fragment around `OrganiserShell` and `GlobalSearch`; the provider becomes their single parent.

- [ ] **Step 6: Run typecheck and focused tests**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/peps-anonymous run test:overview
pnpm --filter @workspace/peps-anonymous run test:workspace-theme
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/repositories.test.ts
```

Expected: typecheck and both existing focused tests pass; the repository-bundle test has 1 pass and 0 failures.

- [ ] **Step 7: Commit repository composition**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/repositories.test.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/repository-context.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx
git commit -m "feat: provide organiser repositories to workspace"
```

## Task 7: Add Order Selectors and Migrate Overview

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts`
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx`

- [ ] **Step 1: Write the failing selector tests**

```ts
// domain/order-selectors.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { countPendingPayments, toOverviewOrders } from "./order-selectors.ts";
import { SAMPLE_ORDERS } from "./sample-orders.ts";

test("toOverviewOrders maps normalized products into display strings", () => {
  const rows = toOverviewOrders(SAMPLE_ORDERS);
  assert.equal(rows[0].products[0], "Semaglutide 5mg × 2");
  assert.equal(rows[0].memberName, "John D.");
});

test("countPendingPayments uses normalized pending status", () => {
  assert.equal(countPendingPayments(SAMPLE_ORDERS), 1);
});
```

- [ ] **Step 2: Run the selector test to verify it fails**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order-selectors.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `domain/order-selectors.ts`.

- [ ] **Step 3: Implement the selectors**

```ts
// domain/order-selectors.ts
import type { OverviewOrder } from "../overview-model.ts";
import type { OrganiserOrder } from "./order.ts";

export function toOverviewOrders(orders: readonly OrganiserOrder[]): OverviewOrder[] {
  return orders.map(order => ({
    id: order.id,
    status: order.status,
    total: order.total,
    memberName: order.memberName,
    products: order.products.map(product => `${product.name} × ${product.quantity}`),
    createdAt: order.createdAt,
  }));
}

export function countPendingPayments(orders: readonly OrganiserOrder[]): number {
  return orders.filter(order => order.status === "pending").length;
}
```

- [ ] **Step 4: Migrate `OverviewTabV3.tsx` to repository orders**

Remove the `loadGb` import, the private `StoredOrder` interface, and `SAMPLE_OVERVIEW_ORDERS`. Replace the overview-model import with the first line below, then add the repository imports:

```tsx
import { buildOverviewSnapshot } from "./overview-model";
import { useOrders } from "./domain/repository-context";
import { toOverviewOrders } from "./domain/order-selectors";
```

Replace the direct storage read and mapping inside the component with:

```tsx
const storedOrders = useOrders();
const overviewOrders = toOverviewOrders(storedOrders);
```

No JSX changes belong in this task. With no persisted order data, Overview will now show the same four shared sample orders as Orders instead of maintaining a contradictory private seven-order fixture.

- [ ] **Step 5: Use the shared pending selector in `Workspace.tsx`**

Add:

```tsx
import { countPendingPayments } from "./domain/order-selectors";
```

Replace the inline pending filter with:

```tsx
const pendingPayments = countPendingPayments(repositoryOrders);
```

- [ ] **Step 6: Run selectors, Overview, and typecheck**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/order-selectors.test.ts
pnpm run test:overview
pnpm run typecheck
```

Expected: selector has 2 passing tests; Overview and typecheck pass.

- [ ] **Step 7: Commit the Overview migration**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/domain/order-selectors.test.ts \
  artifacts/peps-anonymous/src/pages/organiser-v2/OverviewTabV3.tsx \
  artifacts/peps-anonymous/src/pages/organiser-v2/Workspace.tsx
git commit -m "refactor: read organiser overview from order repository"
```

## Task 8: Migrate OrdersTab Reads and Mutations

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`

- [ ] **Step 1: Replace local order state with repository state**

Keep the existing `loadGb` and `saveGb` storage import because `bulkAddTask` still writes todos. Replace the Task 3 order-type import and remove the sample-order import so the local imports contain:

```ts
import { loadGb, saveGb } from "./storage";
import { useOrderRepository, useOrders } from "./domain/repository-context";
import type { OrganiserOrder as Order, OrderStatus } from "./domain/order";
```

Replace:

```tsx
const [orders, setOrders] = useState<Order[]>(() => loadGb<Order[]>(selectedGbId, "orders", SAMPLE_ORDERS, "orders"));

useEffect(() => {
  setOrders(loadGb<Order[]>(selectedGbId, "orders", SAMPLE_ORDERS, "orders"));
}, [selectedGbId]);
```

with:

```tsx
const orderRepository = useOrderRepository();
const orders = useOrders();
```

- [ ] **Step 2: Persist edit-modal changes through `replaceOne`**

Replace `saveOrderChanges` with:

```tsx
const saveOrderChanges = () => {
  if (!editingOrder) return;
  orderRepository.replaceOne(
    {
      ...editingOrder,
      status: editStatus as OrderStatus,
      trackingNumber: editTrackingNumber || undefined,
      internalNotes: editInternalNotes || undefined,
      paymentProof: editTxid
        ? { type: editingOrder.paymentProof?.type ?? "txid", value: editTxid }
        : undefined,
      products: editProducts,
      total: editProducts.reduce(
        (total, product) => total + product.quantity * product.price,
        0,
      ),
      flagged: flagNote.trim()
        ? {
            note: flagNote.trim(),
            dueDate: flagDueDate || undefined,
            dueTime: flagDueTime || undefined,
          }
        : undefined,
    },
    {
      type: "order.updated",
      actorId: "organiser",
      summary: `Updated ${editingOrder.id}`,
    },
  );
  closeEditModal();
};
```

- [ ] **Step 3: Persist bulk product changes through `updateMany`**

Replace `bulkAddProductToOrders` with:

```tsx
const bulkAddProductToOrders = () => {
  const targetOrders = selectedOrders.length > 0
    ? selectedOrders
    : filteredOrders.map(order => order.id);
  const price = Number(bulkProductPrice);
  if (!bulkProductName.trim() || !Number.isFinite(price) || price < 0) return;
  const product = {
    name: bulkProductName.trim(),
    quantity: parseInt(bulkProductQuantity, 10) || 1,
    price,
  };
  orderRepository.updateMany(
    targetOrders,
    order => ({
      ...order,
      products: [...order.products, product],
      total: order.total + product.quantity * product.price,
    }),
    {
      type: "order.product_added",
      actorId: "organiser",
      summary: `Added ${product.name} to ${targetOrders.length} orders`,
    },
  );
  setShowBulkAddProduct(false);
  setBulkProductName("");
  setBulkProductQuantity("1");
  setBulkProductPrice("");
  setSelectedOrders([]);
};
```

- [ ] **Step 4: Route order flags in `bulkAddTask` through the repository**

Replace the complete `bulkAddTask` function so the order mutation uses the repository while its existing todo cross-tab write remains explicit:

```tsx
const bulkAddTask = () => {
  orderRepository.updateMany(
    selectedOrders,
    order => ({
      ...order,
      flagged: {
        note: bulkTaskNote,
        dueDate: bulkTaskDueDate || undefined,
        dueTime: bulkTaskDueTime || undefined,
      },
    }),
    {
      type: "order.task_linked",
      actorId: "organiser",
      summary: `Linked a task to ${selectedOrders.length} orders`,
    },
  );

  const existingTodos = loadGb<any[]>(selectedGbId, "todos", [], "todos");
  const newTodo = {
    id: String(Date.now()),
    title: `Task for ${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""}: ${selectedOrders.join(", ")}`,
    description: bulkTaskNote,
    status: "todo",
    dueDate: bulkTaskDueDate,
    dueTime: bulkTaskDueTime,
    linkedOrderIds: selectedOrders,
    createdAt: new Date().toISOString(),
  };
  saveGb(selectedGbId, "todos", [newTodo, ...existingTodos]);
  window.dispatchEvent(new Event("storage"));

  setShowBulkTaskModal(false);
  setBulkTaskNote("");
  setBulkTaskDueDate("");
  setBulkTaskDueTime("");
  setSelectedOrders([]);
};
```

- [ ] **Step 5: Route paid and dispatched bulk actions through the repository**

Replace both handlers with:

```tsx
const bulkMarkAsPaid = () => {
  const paidAt = new Date().toISOString();
  orderRepository.updateMany(
    selectedOrders,
    order => ({ ...order, status: "paid", paidAt }),
    {
      type: "order.bulk_paid",
      actorId: "organiser",
      summary: `Marked ${selectedOrders.length} orders as paid`,
    },
  );
  setSelectedOrders([]);
};

const bulkMarkAsDispatched = () => {
  orderRepository.updateMany(
    selectedOrders,
    order => ({ ...order, status: "dispatched" }),
    {
      type: "order.bulk_dispatched",
      actorId: "organiser",
      summary: `Marked ${selectedOrders.length} orders as dispatched`,
    },
  );
  setSelectedOrders([]);
};
```

- [ ] **Step 6: Route CSV tracking imports through the repository**

Inside the existing CSV import handler, replace the `updatedOrders`, `setOrders`, and order `saveGb` block with:

```tsx
const importedIds = Object.keys(updates).filter(orderId =>
  orders.some(order => order.id === orderId),
);
orderRepository.updateMany(
  importedIds,
  order => ({
    ...order,
    trackingNumber: updates[order.id],
    status: "dispatched",
  }),
  {
    type: "order.tracking_imported",
    actorId: "organiser",
    summary: `Imported tracking for ${importedIds.length} orders`,
  },
);

setCsvImporting(false);
setShowCsvImportModal(false);
setCsvFile(null);
if (csvInputRef.current) csvInputRef.current.value = "";
```

- [ ] **Step 7: Confirm no direct order writes remain in `OrdersTab.tsx`**

Run:

```bash
rg -n 'setOrders\(|saveGb\(selectedGbId, "orders"' \
  artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx
```

Expected: no matches. A `saveGb` call for `todos` remains and is expected.

- [ ] **Step 8: Run domain tests and typecheck**

Run:

```bash
cd artifacts/peps-anonymous
node --experimental-strip-types --test src/pages/organiser-v2/domain/*.test.ts \
  src/pages/organiser-v2/storage.test.ts
pnpm run typecheck
```

Expected: all domain/storage tests and typecheck pass.

- [ ] **Step 9: Commit the Orders migration**

```bash
git add artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx
git commit -m "refactor: route organiser orders through repository"
```

## Task 9: Add the Focused Domain Test Script

**Files:**
- Modify: `artifacts/peps-anonymous/package.json`

- [ ] **Step 1: Add the script**

Add this key beside the existing organiser test scripts:

```json
"test:domain": "node --experimental-strip-types --test src/pages/organiser-v2/domain/*.test.ts src/pages/organiser-v2/storage.test.ts"
```

- [ ] **Step 2: Run the focused script**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run test:domain
```

Expected: 18 domain and storage tests pass with 0 failures.

- [ ] **Step 3: Run the complete organiser-focused regression set**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run test:domain
pnpm --filter @workspace/peps-anonymous run test:dispatch
pnpm --filter @workspace/peps-anonymous run test:overview
pnpm --filter @workspace/peps-anonymous run test:workspace-theme
pnpm --filter @workspace/peps-anonymous run test:peps-native-theme
```

Expected: every command passes.

- [ ] **Step 4: Commit the test script**

```bash
git add artifacts/peps-anonymous/package.json
git commit -m "test: add organiser domain regression script"
```

## Task 10: Phase 1A Verification Checkpoint

**Files:**
- Verify only; do not modify unrelated files.

- [ ] **Step 1: Run frontend typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 2: Run the production build**

Run:

```bash
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous run build
```

Expected: Vite production build exits 0 and writes `artifacts/peps-anonymous/dist/public`.

- [ ] **Step 3: Verify order persistence compatibility manually**

In a separate terminal, start the production preview:

```bash
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/peps-anonymous run serve
```

Expected: Vite reports `Local: http://localhost:4173/`. Then verify:

1. Open `http://localhost:4173/gborganiser-v2`.
2. Confirm Overview and Orders show the same four repository-backed sample orders.
3. Select two orders and mark them paid.
4. Switch to Overview and confirm the paid lane updates without a page reload.
5. Reload and confirm the update persists.
6. Inspect local storage and confirm `v2:gb_winter25:orders` contains `{ schemaVersion: 1, data: [...] }`.
7. Confirm Todo, Tickets, Dispatch, and setup still open without errors.

Expected: all seven checks pass.

- [ ] **Step 4: Verify event output manually**

After the bulk paid action, inspect `v2:gb_winter25:operationEvents`.

Expected: the first event has:

```json
{
  "schemaVersion": 1,
  "groupBuyId": "gb_winter25",
  "type": "order.bulk_paid",
  "entityType": "order",
  "actorType": "organiser"
}
```

The event must list the selected order IDs and must not contain payment proof values, addresses, or ticket content.

- [ ] **Step 5: Inspect the exact implementation diff**

Run:

```bash
git status --short
git diff --check
git log --oneline -8
```

Expected: no whitespace errors; unrelated user changes remain unstaged; the Phase 1A commits are visible individually.

- [ ] **Step 6: Stop at the checkpoint**

Report:

- focused test totals;
- typecheck and build status;
- manual compatibility results;
- exact Phase 1A commit hashes;
- any pre-existing unrelated worktree changes.

Do not begin the Phase 1B Atlas workspace plan until this checkpoint is reviewed.
