# Merge Order Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge new group-buy items into the original paid order and charge only the incremental amount through that order's balance-payment flow.

**Architecture:** Keep the existing `POST /api/orders` contract used by both add-on entry points, but branch after all server-side membership, product, quantity-limit, and price validation when `additionOfOrderId` identifies a valid paid parent. In one database transaction, lock the parent row, merge line items, increment stored totals and `amountDue`, reset stale balance-payment state, and return the parent order instead of inserting a new order. The review page recognizes the merge response and navigates to the original order detail, where the existing balance-payment UI collects only the increment.

**Tech Stack:** TypeScript, Express, Drizzle ORM/PostgreSQL, React/Vite, Zustand, Vitest.

---

### Task 1: Define and test merge arithmetic

**Files:**
- Create: `artifacts/api-server/src/lib/order-addition-merge.ts`
- Create: `artifacts/api-server/src/lib/order-addition-merge.test.ts`

- [ ] **Step 1: Write the failing unit tests**

Cover:

```ts
calculateAdditionMerge({
  parentProductSubtotal: 110,
  parentGrandTotal: 110,
  parentAmountDue: 0,
  parentTip: 0,
  parentTestingContribution: 0,
  addedProductSubtotal: 120,
  addedTotal: 120,
  addedTip: 0,
  addedTestingContribution: 0,
})
```

Expected:

```ts
{
  productSubtotal: 230,
  grandTotal: 230,
  amountDue: 120,
  tip: 0,
  testingContribution: 0,
}
```

Also assert that an existing unpaid balance is incremented rather than replaced and that all monetary results round to two decimals.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/order-addition-merge.test.ts
```

Expected: FAIL because `calculateAdditionMerge` does not exist.

- [ ] **Step 3: Implement the pure merge calculator**

Create a small pure function that:

```ts
productSubtotal = parentProductSubtotal + addedProductSubtotal;
grandTotal = parentGrandTotal + addedTotal;
amountDue = parentAmountDue + addedTotal;
tip = parentTip + addedTip;
testingContribution = parentTestingContribution + addedTestingContribution;
```

Use a shared two-decimal rounding helper for every result.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the same Vitest command and expect all tests in the file to pass.

### Task 2: Merge validated additions into the parent transactionally

**Files:**
- Modify: `artifacts/api-server/src/routes/orders.ts`
- Test: `artifacts/api-server/src/routes/__tests__/order-addition-parent-group-buy.test.ts`

- [ ] **Step 1: Extend the failing route regression contract**

Assert that the addition branch:

```ts
if (additionParent) {
  // transactionally update additionParent.id
  // return mergedIntoExistingOrder: true
}
```

appears before the normal `insert(ordersTable)` path, and that a top-up no longer persists `additionOfOrderId` on a newly inserted order.

- [ ] **Step 2: Run the focused route test and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/order-addition-parent-group-buy.test.ts
```

Expected: FAIL because the route still inserts a separate order.

- [ ] **Step 3: Implement the transactional merge**

After existing product/price/limit validation and before normal order creation:

1. Start `db.transaction`.
2. Reload and lock the parent with `FOR UPDATE`.
3. Revalidate ownership, paid status, group buy, deletion, and non-wholesale state under the lock.
4. Load existing line items.
5. For an added product at the same unit price, increment the existing quantity and line total; otherwise insert a new line item on the parent.
6. Use `calculateAdditionMerge` to increment `productSubtotal`, `grandTotal`, `amountDue`, `tip`, and `testingContribution`.
7. Keep the original shipping, admin fee, routing, payment status, main payment transaction, and order number unchanged.
8. Clear `balanceTxHash`, `balanceScreenshot`, and `balanceConfirmedAt`; set `balancePaymentStatus` to `"unpaid"` whenever the new `amountDue` is positive.
9. Return the fully formatted parent with:

```ts
{
  ...formatOrderResponse(updatedParent, mergedLineItems),
  mergedIntoExistingOrder: true,
  amountDue: updatedAmountDue,
  balancePaymentStatus: "unpaid",
}
```

Do not generate a new code, insert a new order, consume a reshipper slot, or create a second shipping record.

- [ ] **Step 4: Preserve audit and activity visibility**

Write one audit event and one customer activity event identifying the original order code and incremental amount. Keep Google Sheets push best-effort and send the updated parent snapshot.

- [ ] **Step 5: Run focused and complete API tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/order-addition-merge.test.ts src/routes/__tests__/order-addition-parent-group-buy.test.ts
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server run build:compile
```

Expected: all tests and build pass.

### Task 3: Route merged add-ons to the original order balance

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Review.tsx`
- Create: `artifacts/peps-anonymous/src/pages/order-addition-success.test.ts`

- [ ] **Step 1: Write the failing frontend behavior test**

Extract or define a pure destination resolver and assert:

```ts
resolveOrderSubmitDestination({
  id: "parent-id",
  code: "11337",
  mergedIntoExistingOrder: true,
}) === "/account/orders/parent-id"
```

Also assert normal new orders still resolve to the existing `/success?...` URL.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --experimental-strip-types --test artifacts/peps-anonymous/src/pages/order-addition-success.test.ts
```

Expected: FAIL because merge-aware navigation does not exist.

- [ ] **Step 3: Implement merge-aware success handling**

Extend the submission response type with:

```ts
mergedIntoExistingOrder?: boolean;
amountDue?: number;
balancePaymentStatus?: string | null;
```

After clearing the draft, send merged add-ons directly to `/account/orders/:id`. Do not render the standard success-page `PaymentPanel`, because it submits main-order payments; the order detail already renders `BalancePaymentPanel`, which uses the correct balance endpoints.

- [ ] **Step 4: Update wording**

For an add-on draft, label the review action `Add to Order` rather than `Place Order`. Keep ordinary create/edit wording unchanged.

- [ ] **Step 5: Run frontend tests, typecheck, and build**

Run:

```bash
node --experimental-strip-types --test artifacts/peps-anonymous/src/pages/order-addition-success.test.ts
pnpm --filter @workspace/peps-anonymous run typecheck
pnpm --filter @workspace/peps-anonymous run build
```

Expected: tests and build pass; report separately if known pre-existing type errors remain.

### Task 4: Reconcile Urbanblend789's already-created add-on

**Files:**
- No source file changes; development database transaction only.

- [ ] **Step 1: Verify the exact pair**

Confirm:

```text
#11337: @urbanblend789, U6ZLB, confirmed, HGH 24iu x1
#11482: @urbanblend789, U6ZLB, unpaid, additionOfOrderId=#11337, HCG 10K x1
```

- [ ] **Step 2: Merge without losing auditability**

In one SQL transaction:

1. Lock both orders.
2. Recheck the child is unpaid and linked to the parent.
3. Move/merge its line items onto #11337.
4. Increment #11337 product subtotal and grand total by 120.
5. Set #11337 `amountDue` to 120 and `balancePaymentStatus` to `"unpaid"`.
6. Soft-delete #11482 with a merge-specific deletion marker so it disappears from active customer/admin order lists but remains recoverable.

- [ ] **Step 3: Verify the reconciled result**

Query both records and line items. Expect #11337 to contain HGH 24iu and HCG 10K with a total of 230 and balance due 120; expect #11482 to be soft-deleted and excluded from active order queries.

### Task 5: Runtime verification

**Files:**
- No additional source changes expected.

- [ ] **Step 1: Restart only the canonical workflow**

Restart `Start application`; do not start duplicate API/web workflows that conflict on ports.

- [ ] **Step 2: Check logs and health**

Confirm the app and `/api/config` return 200 and no new server exception appears.

- [ ] **Step 3: Verify the changed flow**

Use an authenticated test or safe API-level reproduction to add an item to a paid test order. Confirm:

- the response returns the parent ID/code,
- active order count does not increase,
- the parent contains the new line item,
- `amountDue` increases by only the add-on total,
- the original `paymentStatus` remains `confirmed`,
- the order detail shows the balance-payment section.

- [ ] **Step 4: Final regression checks**

Run `git diff --check`, inspect the final diff, and capture an app preview screenshot.