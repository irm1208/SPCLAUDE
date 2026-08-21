# Shared Order Fees in Order Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include every applicable shared-order organiser fee in the member order total and provide an idempotent, safe reconciliation for locked orders such as FCZ9YE.

**Architecture:** Store the resolved organiser fee both on the member record and as an immutable materialised snapshot on each locked order. Reuse the existing `amount_due` system when a confirmed order gains a fee, while unpaid orders simply receive a revised total. A protected admin action reconciles one locked share transactionally and is used for FCZ9YE after deployment.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM/PostgreSQL, Vitest, React/Vite.

---

### Task 1: Make the organiser fee a materialised order field

**Files:**
- Modify: `lib/db/src/schema/orders.ts`
- Modify: `artifacts/api-server/src/lib/shared-order-admin-adjustments.ts`
- Modify: `artifacts/api-server/src/lib/shared-order-admin-adjustments.test.ts`

- [ ] **Step 1: Write the failing total-calculation tests**

Extend the existing test input with an `organiserFee` amount and assert it is included in the calculated total:

```ts
it("includes the materialised organiser fee in each member total", () => {
  const result = calculateSharedOrderAdjustment({
    members: [
      { id: "a", items: [{ quantity: 1, unitPrice: 30 }], tip: 0, adjustmentFee: 0, organiserFee: 10 },
      { id: "b", items: [{ quantity: 1, unitPrice: 30 }], tip: 0, adjustmentFee: 0, organiserFee: 0 },
    ],
    splitMode: "even",
    totalShipping: 10,
  });

  expect(result).toEqual([
    { id: "a", subtotal: 30, shippingShare: 5, grandTotal: 45 },
    { id: "b", subtotal: 30, shippingShare: 5, grandTotal: 35 },
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @workspace/api-server test src/lib/shared-order-admin-adjustments.test.ts
```

Expected: the new assertion fails because `organiserFee` is not part of the calculation.

- [ ] **Step 3: Add the schema field and minimal calculator support**

Add a non-null cents-precision `organiserFee` column to `ordersTable`:

```ts
organiserFee: numeric("organiser_fee", { precision: 10, scale: 2 }).notNull().default("0"),
```

Extend `AdminAdjustmentMember` with `organiserFee?: number` and add it to the total:

```ts
const grandTotal = Number((
  subtotal + shippingShare + (Number(member.tip) || 0) +
  (Number(member.kitFees) || 0) +
  (Number(member.adjustmentFee) || 0) +
  (Number(member.organiserFee) || 0)
).toFixed(2));
```

- [ ] **Step 4: Run the focused test and typecheck**

Run:

```bash
pnpm --filter @workspace/api-server test src/lib/shared-order-admin-adjustments.test.ts
pnpm --filter @workspace/db run typecheck
```

Expected: test passes and the shared DB package typechecks.

- [ ] **Step 5: Commit the completed unit**

```bash
git add lib/db/src/schema/orders.ts artifacts/api-server/src/lib/shared-order-admin-adjustments.ts artifacts/api-server/src/lib/shared-order-admin-adjustments.test.ts
git commit -m "feat: materialize organiser fees on shared orders"
```

### Task 2: Reconcile included fees safely in the server

**Files:**
- Create: `artifacts/api-server/src/lib/shared-order-organiser-fees.ts`
- Create: `artifacts/api-server/src/lib/shared-order-organiser-fees.test.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`

- [ ] **Step 1: Write failing reconciliation-decision tests**

Create a pure helper test that defines the exact state transition:

```ts
it("updates an unpaid order total without creating a balance", () => {
  expect(buildOrganiserFeeOrderUpdate({
    oldFee: 0, newFee: 10, grandTotal: 145.6, amountDue: 0, paymentStatus: "unpaid",
  })).toEqual({
    organiserFee: 10, grandTotal: 155.6, amountDue: 0, resetPaymentLock: true,
  });
});

it("adds only the fee delta to a confirmed order balance", () => {
  expect(buildOrganiserFeeOrderUpdate({
    oldFee: 0, newFee: 10, grandTotal: 218.4, amountDue: 0, paymentStatus: "confirmed",
  })).toEqual({
    organiserFee: 10, grandTotal: 228.4, amountDue: 10, resetBalancePayment: true,
  });
});

it("is idempotent when the materialised fee already matches", () => {
  expect(buildOrganiserFeeOrderUpdate({
    oldFee: 10, newFee: 10, grandTotal: 228.4, amountDue: 10, paymentStatus: "confirmed",
  }).changed).toBe(false);
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
pnpm --filter @workspace/api-server test src/lib/shared-order-organiser-fees.test.ts
```

Expected: failure because the helper does not yet exist.

- [ ] **Step 3: Implement the pure order-update helper**

Create `buildOrganiserFeeOrderUpdate` with these rules:

```ts
const delta = roundCents(newFee - oldFee);
const nextGrandTotal = roundCents(grandTotal + delta);

if (paymentStatus === "confirmed") {
  return {
    changed: delta !== 0,
    organiserFee: newFee,
    grandTotal: nextGrandTotal,
    amountDue: roundCents(amountDue + Math.max(0, delta)),
    resetBalancePayment: delta > 0,
  };
}

return {
  changed: delta !== 0,
  organiserFee: newFee,
  grandTotal: nextGrandTotal,
  amountDue,
  resetPaymentLock: delta !== 0,
};
```

Reject negative resulting fees and do not reduce a previously settled balance in this change.

- [ ] **Step 4: Run the helper test and verify it passes**

Run:

```bash
pnpm --filter @workspace/api-server test src/lib/shared-order-organiser-fees.test.ts
```

Expected: all reconciliation scenarios pass.

- [ ] **Step 5: Use the materialised fee when locking a share**

In `attemptLockShare`, calculate the effective member fee after recipient exemption, persist it as `orders.organiserFee`, and include it in the lock-time `grandTotal`. Preserve the existing `wholesale_share_members.organiser_fee` snapshot.

- [ ] **Step 6: Pass organiser fees through all locked-total recalculations**

When `calculateSharedOrderAdjustment` is called for locked shares, include the current `orders.organiserFee` / member organiser fee. Do not accidentally drop the fee when an admin changes shipping, items, kit fees, or admin adjustments.

- [ ] **Step 7: Add protected idempotent reconciliation routes**

Add an admin-only `POST /admin/wholesale-shares/:id/reconcile-organiser-fees` route and an admin-only `POST /admin/wholesale-shares/reconcile-organiser-fees` batch route. The batch route processes every current `locked` share and returns a per-share summary; it must skip open, cancelled, submitted, and completed shares. Both routes use the same per-share transaction, which must:

1. require the existing admin secret;
2. row-lock the share and reject every status other than `locked`;
3. row-lock members and their materialised orders;
4. resolve each effective fee after organiser/recipient exemption;
5. call `buildOrganiserFeeOrderUpdate`;
6. atomically update `orders.organiserFee`, `orders.grandTotal`, and, where applicable, `orders.amountDue` plus balance-payment state;
7. clear non-final crypto locks for revised unpaid orders;
8. record an audit log with order count, updated count, and balance-due total;
9. return the refreshed share detail for the single route, or an aggregate summary for the batch route.

Use the same server helper from the locked fee-edit route so a future admin fee change, single-share reconciliation, and all-locked reconciliation have identical money behavior.

- [ ] **Step 8: Add server route tests with the existing DB schema-only mock**

Add route-level tests that prove:

```ts
// locked share only; submitted is rejected
// an already materialised $10 fee produces no further total/balance update
// confirmed member receives only a $10 balance
// unpaid member receives the $10 in grand total and has paymentUsdAmount cleared
```

Run:

```bash
pnpm --filter @workspace/api-server test src/lib/shared-order-organiser-fees.test.ts src/lib/shared-order-admin-adjustments.test.ts src/routes/__tests__/shared-order-organiser-fees.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 9: Commit the completed server unit**

```bash
git add artifacts/api-server/src/lib/shared-order-organiser-fees.ts artifacts/api-server/src/lib/shared-order-organiser-fees.test.ts artifacts/api-server/src/lib/shared-order-admin-adjustments.ts artifacts/api-server/src/routes/wholesale-shares.ts artifacts/api-server/src/routes/admin.ts artifacts/api-server/src/routes/__tests__/shared-order-organiser-fees.test.ts
git commit -m "feat: include organiser fees in shared order payments"
```

### Task 3: Show one itemised payment in the shared-order UI

**Files:**
- Modify: `artifacts/peps-anonymous/src/hooks/use-wholesale-shares.ts`
- Modify: `artifacts/peps-anonymous/src/components/wholesale-shared/WhatYouOwe.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/WholesaleShared.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`

- [ ] **Step 1: Add a failing component test or render assertion**

Add a focused test that passes a locked member with a $10 organiser fee and asserts:

```tsx
expect(screen.getByText("Organiser fee")).toBeInTheDocument();
expect(screen.getByText("$155.60")).toBeInTheDocument();
expect(screen.queryByText(/settled directly with the organiser/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run it and verify it fails**

Run the repository’s existing frontend test command for the new test file. Expected: failure because the component still presents two payments.

- [ ] **Step 3: Update the response types and payment view**

Expose `orderOrganiserFee` and `orderGrandTotal` from the shared-order API for locked members. Update `WhatYouOwe` to:

1. use the server-provided materialised order total when it exists;
2. show “Organiser fee” as a line in the order breakdown;
3. keep one “Pay now” action for the complete amount;
4. remove the organiser payment-method accordion and manual fee-paid badge from the member flow.

Keep loading/open-share preview states safe by falling back only when no materialised order exists.

- [ ] **Step 4: Add a clear admin reconciliation control**

In `AdminWholesaleSharesTab`, add a visible button for locked shares:

```tsx
<button
  onClick={() => runAdminAction(
    detail.id,
    "reconcile included organiser fees",
    `/wholesale-shares/${detail.id}/reconcile-organiser-fees`,
    "POST",
  )}
  disabled={!!adminAction}
>
  Reconcile included fees
</button>
```

Refresh the detail after a successful action and display the itemised fee/balance in the member rows.

- [ ] **Step 5: Run frontend tests and typechecks**

Run:

```bash
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: the focused UI test and existing frontend checks pass.

- [ ] **Step 6: Commit the completed client unit**

```bash
git add artifacts/peps-anonymous/src/hooks/use-wholesale-shares.ts artifacts/peps-anonymous/src/components/wholesale-shared/WhatYouOwe.tsx artifacts/peps-anonymous/src/pages/WholesaleShared.tsx artifacts/peps-anonymous/src/pages/Admin.tsx
git commit -m "feat: show organiser fees in shared order totals"
```

### Task 4: Verify, publish schema, and reconcile FCZ9YE

**Files:**
- Modify: `.agents/memory/wholesale-p2p-fees.md`
- Modify: `.agents/memory/MEMORY.md` only if the existing index hook needs wording updated

- [ ] **Step 1: Run the full relevant validation suite**

Run:

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: all newly added tests pass; report unrelated pre-existing failures separately if any remain.

- [ ] **Step 2: Restart the canonical application workflow and inspect logs**

Restart `Start application`, then inspect new workflow and browser logs. Confirm the API starts, the frontend builds, and no runtime error references `organiser_fee`.

- [ ] **Step 3: Verify the local shared-order payment screen**

Capture the local shared-order view and the admin Shared Orders detail. Confirm the payment card has one total containing the organiser-fee line and the admin button appears only for locked shares.

- [ ] **Step 4: Publish with the schema migration**

Use the Publish flow so it applies the `orders.organiser_fee` schema change to production. Do not use direct production DDL or a startup migration.

- [ ] **Step 5: Reconcile every current locked shared order in production**

After the production deployment is healthy, invoke the protected all-locked reconciliation action once. Confirm its summary includes `FCZ9YE`, then verify it from a read-only production query:

```sql
SELECT
  organiser_fee,
  grand_total,
  amount_due,
  payment_status,
  balance_payment_status
FROM orders
WHERE shared_order_id = 'FCZ9YE'
ORDER BY code;
```

Expected: seven applicable member orders have `organiser_fee = 10.00`; unpaid members’ totals increase by $10; confirmed members retain `payment_status = 'confirmed'` and have `amount_due = 10.00`; the organiser/recipient remains at `organiser_fee = 0.00`. Other locked shares are reconciled once and repeated invocation reports zero additional monetary change.

- [ ] **Step 6: Update durable project memory**

Replace the old peer-to-peer-fee rule with the new platform-collected organiser-fee rule, including the invariant that materialised shared-order fee changes adjust unpaid totals and confirmed-order balances idempotently.

- [ ] **Step 7: Commit and deliver**

```bash
git add lib/db/src/schema/orders.ts \
  artifacts/api-server/src/lib/shared-order-organiser-fees.ts \
  artifacts/api-server/src/lib/shared-order-organiser-fees.test.ts \
  artifacts/api-server/src/lib/shared-order-admin-adjustments.ts \
  artifacts/api-server/src/lib/shared-order-admin-adjustments.test.ts \
  artifacts/api-server/src/routes/wholesale-shares.ts \
  artifacts/api-server/src/routes/admin.ts \
  artifacts/api-server/src/routes/__tests__/shared-order-organiser-fees.test.ts \
  artifacts/peps-anonymous/src/hooks/use-wholesale-shares.ts \
  artifacts/peps-anonymous/src/components/wholesale-shared/WhatYouOwe.tsx \
  artifacts/peps-anonymous/src/pages/WholesaleShared.tsx \
  artifacts/peps-anonymous/src/pages/Admin.tsx \
  .agents/memory/wholesale-p2p-fees.md \
  .agents/memory/MEMORY.md
git commit -m "fix: reconcile shared order organiser fees"
git status --short
```

Report the deployment and FCZ9YE reconciliation evidence, including the number of affected unpaid and confirmed orders.