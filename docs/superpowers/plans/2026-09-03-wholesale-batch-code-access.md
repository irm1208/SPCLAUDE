# Wholesale Batch-Code Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one current Qiyunle batch code on the Wholesale Order catalogue only to accounts with more than five qualifying wholesale orders.

**Architecture:** Put eligibility, candidate ranking, and response shaping in a small pure backend policy module. The wholesale catalogue route authenticates the wholesale account, evaluates its own order history, and conditionally enriches products; the Qiyunle sync transactionally clears stale mapping stock before writing the current positive feed. The React catalogue renders only the optional server-authorized field.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM/PostgreSQL, Vitest, React 19, Vite.

---

## File map

- Create `artifacts/api-server/src/lib/wholesale-batch-access.ts`
  - Pure eligibility, date-suffix ranking, preferred-batch selection, and
    authorized response-enrichment functions.
- Create `artifacts/api-server/src/lib/wholesale-batch-access.test.ts`
  - Boundary, status, ranking, and response-privacy tests.
- Modify `artifacts/api-server/src/lib/qiyunle-inventory.ts`
  - Add a pure helper that identifies mappings absent from the current positive
    source feed.
- Modify `artifacts/api-server/src/lib/qiyunle-inventory.test.ts`
  - Add stale-mapping reconciliation tests.
- Modify `artifacts/api-server/src/lib/qiyunle-sync.ts`
  - Transactionally null stale mapping stock and write current positive values.
- Modify `artifacts/api-server/src/routes/products.ts`
  - Protect the wholesale catalogue with `requireWholesale`, load the current
    account's qualifying history, and add one authorized `batchCode`.
- Modify `artifacts/peps-anonymous/src/pages/WholesaleOrder.tsx`
  - Accept and render the optional batch code.
- Create `artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs`
  - Focused source-contract assertion for conditional rendering.

### Task 1: Backend eligibility and preferred-batch policy

**Files:**
- Create: `artifacts/api-server/src/lib/wholesale-batch-access.ts`
- Create: `artifacts/api-server/src/lib/wholesale-batch-access.test.ts`

- [ ] **Step 1: Write the failing policy tests**

Create tests with these records and assertions:

```ts
import { describe, expect, it } from "vitest";
import {
  hasWholesaleBatchAccess,
  selectPreferredBatchCodes,
  withAuthorizedBatchCode,
} from "./wholesale-batch-access";

const paidWholesale = {
  orderType: "wholesale",
  status: "Submitted",
  paymentStatus: "confirmed",
  deletedAt: null,
};

describe("hasWholesaleBatchAccess", () => {
  it("requires more than five qualifying wholesale orders", () => {
    expect(hasWholesaleBatchAccess(Array(5).fill(paidWholesale))).toBe(false);
    expect(hasWholesaleBatchAccess(Array(6).fill(paidWholesale))).toBe(true);
  });

  it("counts confirmed, test-confirmed, and completed wholesale orders only", () => {
    const qualifying = [
      paidWholesale,
      { ...paidWholesale, paymentStatus: "test_confirmed" },
      { ...paidWholesale, paymentStatus: "pending_confirmation", status: "Completed" },
    ];
    const excluded = [
      { ...paidWholesale, paymentStatus: "unpaid" },
      { ...paidWholesale, paymentStatus: "failed" },
      { ...paidWholesale, status: "Cancelled" },
      { ...paidWholesale, deletedAt: new Date() },
      { ...paidWholesale, orderType: "shop" },
    ];
    expect(hasWholesaleBatchAccess([...qualifying, ...qualifying])).toBe(true);
    expect(hasWholesaleBatchAccess([...qualifying, ...excluded])).toBe(false);
  });
});

describe("selectPreferredBatchCodes", () => {
  it("selects highest stock first and newest MMDD suffix on a stock tie", () => {
    const selected = selectPreferredBatchCodes([
      { productId: "p1", code: "BP10-0712", stock: 8 },
      { productId: "p1", code: "BP10-0813", stock: 36 },
      { productId: "p1", code: "BP10-0823", stock: 36 },
      { productId: "p2", code: "CAG10-0802", stock: 267 },
    ]);
    expect(selected.get("p1")).toBe("BP10-0823");
    expect(selected.get("p2")).toBe("CAG10-0802");
  });

  it("ignores non-positive candidates", () => {
    expect(selectPreferredBatchCodes([
      { productId: "p1", code: "BP10-0823", stock: 0 },
      { productId: "p1", code: "BP10-0824", stock: -2 },
    ]).has("p1")).toBe(false);
  });
});

describe("withAuthorizedBatchCode", () => {
  it("omits the field for ineligible accounts", () => {
    expect(withAuthorizedBatchCode({ id: "p1", name: "BPC" }, false, new Map([["p1", "BP10-0823"]])))
      .toEqual({ id: "p1", name: "BPC" });
  });

  it("adds exactly one selected code for eligible accounts", () => {
    expect(withAuthorizedBatchCode({ id: "p1", name: "BPC" }, true, new Map([["p1", "BP10-0823"]])))
      .toEqual({ id: "p1", name: "BPC", batchCode: "BP10-0823" });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/wholesale-batch-access.test.ts
```

Expected: FAIL because `./wholesale-batch-access` does not exist.

- [ ] **Step 3: Implement the pure policy module**

Implement these public contracts:

```ts
export interface WholesaleOrderAccessRecord {
  orderType: string | null;
  status: string;
  paymentStatus: string;
  deletedAt: Date | null;
}

export interface WholesaleBatchCandidate {
  productId: string;
  code: string;
  stock: number;
}

export function hasWholesaleBatchAccess(
  orders: WholesaleOrderAccessRecord[],
): boolean;

export function selectPreferredBatchCodes(
  candidates: WholesaleBatchCandidate[],
): Map<string, string>;

export function withAuthorizedBatchCode<T extends { id: string }>(
  product: T,
  eligible: boolean,
  selected: ReadonlyMap<string, string>,
): T & { batchCode?: string };
```

The eligibility predicate must require:

```ts
const wholesale = order.orderType === "wholesale"
  || order.orderType === "wholesale_shared";
const paid = order.paymentStatus === "confirmed"
  || order.paymentStatus === "test_confirmed";
const completed = order.status === "Completed";
const qualifying = wholesale
  && order.deletedAt == null
  && order.status !== "Cancelled"
  && (paid || completed);
```

Access is `orders.filter(qualifying).length > 5`.

For candidate ranking:

1. discard `stock <= 0`;
2. prefer greater `stock`;
3. on equal stock, parse a trailing `-MMDD` with
   `/-(\d{2})(\d{2})$/` and prefer the greater `MM * 100 + DD`;
4. prefer a parseable date over an unparseable date;
5. use `code.localeCompare()` as the final stable tie-breaker.

- [ ] **Step 4: Run the policy tests and verify GREEN**

Run the same Vitest command. Expected: one test file passes with no warnings.

- [ ] **Step 5: Commit the policy unit**

```bash
git add artifacts/api-server/src/lib/wholesale-batch-access.ts \
  artifacts/api-server/src/lib/wholesale-batch-access.test.ts
git commit -m "feat: define wholesale batch access policy"
```

### Task 2: Reconcile stale Qiyunle mapping stock

**Files:**
- Modify: `artifacts/api-server/src/lib/qiyunle-inventory.ts`
- Modify: `artifacts/api-server/src/lib/qiyunle-inventory.test.ts`
- Modify: `artifacts/api-server/src/lib/qiyunle-sync.ts`

- [ ] **Step 1: Add the failing reconciliation helper test**

Extend the inventory test:

```ts
import {
  filterNonPositiveStockItems,
  findUnavailableMappedCodes,
} from "./qiyunle-inventory";

it("finds mappings absent from the current positive-stock feed", () => {
  expect(findUnavailableMappedCodes(
    ["BP10-0712", "BP10-0823", "CAG10-0802"],
    ["BP10-0823", "CAG10-0802"],
  )).toEqual(["BP10-0712"]);
});
```

- [ ] **Step 2: Run the inventory test and verify RED**

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/qiyunle-inventory.test.ts
```

Expected: FAIL because `findUnavailableMappedCodes` is not exported.

- [ ] **Step 3: Implement the minimal helper**

```ts
export function findUnavailableMappedCodes(
  mappedCodes: Iterable<string>,
  currentPositiveCodes: Iterable<string>,
): string[] {
  const current = new Set(currentPositiveCodes);
  return [...mappedCodes].filter((code) => !current.has(code)).sort();
}
```

- [ ] **Step 4: Run the inventory test and verify GREEN**

Run the same focused test. Expected: all inventory helper tests pass.

- [ ] **Step 5: Add a failing sync reconciliation assertion**

Extract a focused async function in `qiyunle-sync.ts` with this contract so the
database writes can be tested independently from login and AI auto-mapping:

```ts
export async function reconcileQiyunleBatchStock(
  positiveStockByCode: ReadonlyMap<string, number>,
): Promise<void>;
```

Add a Vitest test that mocks the transaction adapter and expects one atomic
operation to:

- set all existing mapping `batchStock` values to `null`;
- write only entries whose value is greater than zero; and
- never write zero or negative values.

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/qiyunle-sync-reconciliation.test.ts
```

Expected: FAIL because the reconciliation function does not exist.

- [ ] **Step 6: Implement transactional mapping reconciliation**

Import `qiyunleMappingsTable` and `eq`. Implement:

```ts
await db.transaction(async (tx) => {
  await tx.update(qiyunleMappingsTable).set({ batchStock: null });
  for (const [code, stock] of positiveStockByCode) {
    if (stock <= 0) continue;
    await tx
      .update(qiyunleMappingsTable)
      .set({ batchStock: stock })
      .where(eq(qiyunleMappingsTable.qiyunleCode, code));
  }
});
```

Replace the existing per-code `UPDATE qiyunle_mappings SET batch_stock` loop
with one call after the complete fetch and mapping pass. Do not call it from
fetch-error paths.

- [ ] **Step 7: Run focused sync tests and compile**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/qiyunle-inventory.test.ts \
  src/lib/qiyunle-sync-reconciliation.test.ts
pnpm --filter @workspace/api-server run build:compile
```

Expected: focused tests pass and the server bundle completes.

- [ ] **Step 8: Commit reconciliation**

```bash
git add artifacts/api-server/src/lib/qiyunle-inventory.ts \
  artifacts/api-server/src/lib/qiyunle-inventory.test.ts \
  artifacts/api-server/src/lib/qiyunle-sync.ts \
  artifacts/api-server/src/lib/qiyunle-sync-reconciliation.test.ts
git commit -m "fix: reconcile current Qiyunle batch stock"
```

### Task 3: Authorize and enrich the wholesale catalogue response

**Files:**
- Modify: `artifacts/api-server/src/routes/products.ts`
- Test: `artifacts/api-server/src/lib/wholesale-batch-access.test.ts`

- [ ] **Step 1: Extend the response-shaping tests**

Add assertions that:

- a selected map with several product entries adds at most one `batchCode` to
  each matching product;
- a product without a selected code omits `batchCode`; and
- setting `eligible=false` omits every batch field.

Run the policy test and verify the new assertion fails before adjusting any
implementation needed by the route.

- [ ] **Step 2: Protect the endpoint and load account-owned order history**

Change the route signature to:

```ts
router.get("/wholesale/products", requireWholesale, async (req, res): Promise<void> => {
  const username = req.wholesale!.telegramUsername.replace(/^@/, "").toLowerCase();
  const usernameWithAt = `@${username}`;
```

Load only these order columns:

```ts
const orderRows = await db
  .select({
    orderType: ordersTable.orderType,
    status: ordersTable.status,
    paymentStatus: ordersTable.paymentStatus,
    deletedAt: ordersTable.deletedAt,
  })
  .from(ordersTable)
  .where(sql`lower(${ordersTable.telegramUsername}) IN (${username}, ${usernameWithAt})`);
```

Compute access only with `hasWholesaleBatchAccess(orderRows)`.

- [ ] **Step 3: Load and rank positive-stock mappings only when eligible**

When eligible, query:

```ts
const mappingRows = await db
  .select({
    productId: qiyunleMappingsTable.productId,
    code: qiyunleMappingsTable.qiyunleCode,
    stock: qiyunleMappingsTable.batchStock,
  })
  .from(qiyunleMappingsTable)
  .where(gt(qiyunleMappingsTable.batchStock, 0));
```

Convert nullable Drizzle output to candidates, call
`selectPreferredBatchCodes`, then call `withAuthorizedBatchCode` around the
existing product DTO. Do not query mappings when the account is ineligible.

- [ ] **Step 4: Run backend tests and compile**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/wholesale-batch-access.test.ts \
  src/lib/qiyunle-inventory.test.ts \
  src/lib/qiyunle-sync-reconciliation.test.ts
pnpm --filter @workspace/api-server run build:compile
```

Expected: tests and compilation pass.

- [ ] **Step 5: Commit the protected catalogue**

```bash
git add artifacts/api-server/src/routes/products.ts \
  artifacts/api-server/src/lib/wholesale-batch-access.test.ts
git commit -m "feat: expose current batches to repeat wholesale buyers"
```

### Task 4: Render the authorized code in the Wholesale Order catalogue

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/WholesaleOrder.tsx`
- Create: `artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs`

- [ ] **Step 1: Write the failing display contract test**

Create a Node test that reads `WholesaleOrder.tsx` and asserts the product type
declares `batchCode?: string` and the product card conditionally references
`product.batchCode` next to a `Batch:` label.

Run:

```bash
node --test artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs
```

Expected: FAIL because the field and label do not exist.

- [ ] **Step 2: Add the optional field and catalogue label**

Extend `ProductWithMeta`:

```ts
batchCode?: string;
```

In the existing product-information area, add:

```tsx
{product.batchCode && (
  <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--t-muted)" }}>
    Batch: <span className="font-mono font-semibold" style={{ color: "var(--t-text)" }}>
      {product.batchCode}
    </span>
  </p>
)}
```

Do not alter quantity controls, stock labels, lab-report actions, product
search, or checkout calculations.

- [ ] **Step 3: Run the display contract and frontend build**

```bash
node --test artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs
pnpm --filter @workspace/peps-anonymous run build
```

Expected: the contract passes and Vite produces a production build.

- [ ] **Step 4: Commit the catalogue display**

```bash
git add artifacts/peps-anonymous/src/pages/WholesaleOrder.tsx \
  artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs
git commit -m "feat: display authorized wholesale batch code"
```

### Task 5: End-to-end verification

**Files:**
- Verify all files above.

- [ ] **Step 1: Run the complete focused verification set**

```bash
pnpm --filter @workspace/api-server exec vitest run \
  src/lib/wholesale-batch-access.test.ts \
  src/lib/qiyunle-inventory.test.ts \
  src/lib/qiyunle-sync-reconciliation.test.ts
node --test artifacts/peps-anonymous/src/pages/wholesale-batch-display.test.mjs
pnpm --filter @workspace/api-server run build:compile
pnpm --filter @workspace/peps-anonymous run build
git diff --check
```

Expected: every command exits zero.

- [ ] **Step 2: Restart only the canonical application workflow**

Restart `Start application` once. Do not restart the duplicate artifact API or
web workflows, which compete for the same ports.

- [ ] **Step 3: Inspect workflow and browser logs**

Confirm:

- API reports `Server listening on port 8080`;
- Vite reports ready;
- there are no new compile/runtime errors from the product route or catalogue;
- unauthenticated `/api/wholesale/products` requests are rejected; and
- the app preview still renders.

- [ ] **Step 4: Verify the authorized response with controlled test data**

Using development data or a signed development account session:

- an account with five qualifying orders receives no `batchCode`;
- an account with six qualifying orders receives exactly one `batchCode` for a
  mapped positive-stock product;
- the selected code belongs to the highest-stock mapping; and
- an equal-stock tie selects the newest `-MMDD` suffix.

- [ ] **Step 5: Final review**

Review the final diff against
`docs/superpowers/specs/2026-09-03-wholesale-batch-code-access-design.md`.
Confirm no batch code is serialized for ineligible accounts and no zero or
negative stock value is persisted during reconciliation.