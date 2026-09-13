# Shared Wholesale Organiser Payment Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the shared-wholesale organiser's linked personal order as confirmed only when the organiser-to-platform payment is safely confirmed, with idempotent audit/notification behavior and a safe historical backfill.

**Architecture:** Add a focused domain service that validates and transactionally confirms the parent shared payment plus only the creator's linked order. Manual admin confirmation, automatic verification, and a rerunnable backfill call the same service; existing API responses and UI refresh paths consume the persisted order status.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM, PostgreSQL, Vitest, React 19, Vite.

---

## File Structure

- Create `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.ts`: validation, row locking, idempotent parent/order transition, transactional audit insertion, and typed outcomes.
- Create `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts`: behavior tests with a transaction-capable database fixture/mock matching existing API-server test conventions.
- Modify `artifacts/api-server/src/lib/wholesale-organiser-payment-auto-verify.ts`: delegate successful verification to the shared confirmation service and notify only on a real transition.
- Modify `artifacts/api-server/src/routes/wholesale-shares.ts`: delegate manual admin confirmation to the service and return explicit idempotent/error responses.
- Create `artifacts/api-server/scripts/backfill-shared-organiser-order-payments.ts`: rerunnable historical repair and summary output.
- Modify `artifacts/api-server/package.json`: add an explicit backfill script command.
- Modify `artifacts/api-server/src/routes/__tests__/wholesale-share-confirmation.test.ts`: source-level wiring and response regression checks where full route tests are not practical.
- Modify `artifacts/peps-anonymous/src/pages/Admin.tsx`: refresh both detail and grouped row data after confirmation and treat idempotent success as success.

### Task 1: Build the transactional confirmation domain service

**Files:**
- Create: `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.ts`
- Create: `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts`

- [ ] **Step 1: Write failing tests for successful creator-only confirmation**

Create fixtures for one submitted share, one creator member with a linked `wholesale_shared` order, and one ordinary member order. Assert that source `automatic`:

```ts
const result = await confirmWholesaleOrganiserPayment({
  shareId: "SHARE1",
  source: "automatic",
  expectedCurrentParentStatus: "pending",
});

expect(result.kind).toBe("confirmed");
expect(savedShare.organiserPaymentStatus).toBe("confirmed");
expect(savedCreatorOrder.paymentStatus).toBe("confirmed");
expect(savedMemberOrder.paymentStatus).toBe("unpaid");
expect(insertedAudits).toHaveLength(1);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/wholesale-organiser-payment-confirmation.test.ts
```

Expected: FAIL because the confirmation service does not exist.

- [ ] **Step 3: Add mismatch, protection, and idempotency tests**

Cover:

- creator username mismatch;
- missing or duplicate creator member;
- missing linked order;
- wrong `sharedOrderId`, username, or `orderType`;
- cancelled/open/locked parent;
- missing transaction hash/currency/network;
- non-positive expected amount;
- already-confirmed parent plus already-confirmed creator order;
- already-confirmed parent plus unpaid creator order for `backfill`;
- `test_confirmed` creator order remains unchanged;
- repeated and concurrent calls create one transition and one audit.

Each failure must assert that parent, creator order, member orders, and audit rows are unchanged.

- [ ] **Step 4: Implement the minimal service**

Export:

```ts
export type OrganiserPaymentConfirmationSource = "automatic" | "admin" | "backfill";

export type OrganiserPaymentConfirmationResult =
  | { kind: "confirmed"; shareId: string; organiserOrderId: string; orderChanged: boolean }
  | { kind: "already_confirmed"; shareId: string; organiserOrderId: string }
  | { kind: "rejected"; code: string; message: string };

export async function confirmWholesaleOrganiserPayment(input: {
  shareId: string;
  source: OrganiserPaymentConfirmationSource;
  expectedCurrentParentStatus?: "pending" | "confirmed";
}): Promise<OrganiserPaymentConfirmationResult>;
```

Inside one `db.transaction`:

- select the share `FOR UPDATE`;
- require submitted state and the source-appropriate parent status;
- require stored transaction identity;
- compute and require a positive product-plus-shipping amount using the existing calculation;
- select the creator member `FOR UPDATE`, matching `isCreator` and `creatorUsername`;
- select its linked order `FOR UPDATE`;
- verify `orderType`, `sharedOrderId`, and username;
- conditionally update pending parent status to confirmed;
- conditionally update only the creator order when status is `unpaid` or `pending`;
- insert action `wholesale_share_organiser_order_payment_confirmed` only when the creator order transitions, including source, reason, share ID, and order ID in metadata;
- return `already_confirmed` when no persisted state needs changing.

Do not call `writeLog` inside the transaction because it uses the global database handle and swallows errors. Insert `auditLogsTable` through the transaction so confirmation and audit are atomic.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run the focused test command. Expected: all confirmation service tests pass.

### Task 2: Route automatic and manual confirmation through the service

**Files:**
- Modify: `artifacts/api-server/src/lib/wholesale-organiser-payment-auto-verify.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/routes/__tests__/wholesale-share-confirmation.test.ts`

- [ ] **Step 1: Write failing wiring tests**

Assert that:

- automatic verification calls `confirmWholesaleOrganiserPayment` only after `verifyTransaction(...).verified`;
- failed verification never calls confirmation;
- admin confirmation delegates with source `admin`;
- admin repeated confirmation returns a successful idempotent response rather than `409`;
- rejected service outcomes produce a clear error response.

- [ ] **Step 2: Run route and service tests to verify RED**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/routes/__tests__/wholesale-share-confirmation.test.ts src/lib/wholesale-organiser-payment-confirmation.test.ts
```

Expected: new wiring assertions fail.

- [ ] **Step 3: Update automatic verification**

Replace the local parent-only `confirmOrganiserPayment` mutation with the shared service. Preserve the existing 1% verification tolerance. Notify and log to the console only when `result.kind === "confirmed"`; do not notify for `already_confirmed`, rejected, failed, or pending verification.

- [ ] **Step 4: Update manual admin confirmation**

Call the service with source `admin`. Map results as follows:

```ts
if (result.kind === "rejected") {
  res.status(result.code === "not_found" ? 404 : 409).json({ error: result.message, code: result.code });
  return;
}
res.json({
  ok: true,
  alreadyConfirmed: result.kind === "already_confirmed",
  organiserOrderId: result.organiserOrderId,
});
```

Remove the route's direct parent update and separate audit write.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 2 command. Expected: all focused tests pass.

### Task 3: Add and run the safe historical backfill

**Files:**
- Create: `artifacts/api-server/scripts/backfill-shared-organiser-order-payments.ts`
- Modify: `artifacts/api-server/package.json`
- Extend: `artifacts/api-server/src/lib/wholesale-organiser-payment-confirmation.test.ts`

- [ ] **Step 1: Write failing backfill behavior tests**

Test a backfill runner over:

- valid confirmed parent plus unpaid creator order;
- already-correct confirmed parent;
- confirmed parent with unsafe/missing payment identity;
- confirmed parent with mismatched creator order;
- ordinary member orders;
- a second identical run.

Assert one repair, categorized skips, unchanged member orders, and zero changes/audits on rerun.

- [ ] **Step 2: Verify RED**

Run the confirmation service test. Expected: FAIL because no backfill runner exists.

- [ ] **Step 3: Implement the rerunnable command**

Query confirmed parent shares in stable ID order and call the service with:

```ts
await confirmWholesaleOrganiserPayment({
  shareId,
  source: "backfill",
  expectedCurrentParentStatus: "confirmed",
});
```

Print totals for scanned, repaired, already correct, and skipped-by-code. Set a non-zero exit code only for unexpected execution errors, not safely skipped records. Do not notify users.

Add:

```json
"backfill:shared-organiser-payments": "tsx scripts/backfill-shared-organiser-order-payments.ts"
```

- [ ] **Step 4: Verify GREEN and run the development backfill once**

Run:

```bash
pnpm --filter @workspace/api-server test -- src/lib/wholesale-organiser-payment-confirmation.test.ts
pnpm --filter @workspace/api-server run backfill:shared-organiser-payments
```

Record only aggregate counts; never print wallet addresses, transaction hashes, or usernames.

- [ ] **Step 5: Run the backfill a second time**

Expected: zero repairs and no duplicate audit rows.

### Task 4: Refresh all affected admin status views

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`
- Modify: `artifacts/api-server/src/routes/__tests__/wholesale-share-confirmation.test.ts`

- [ ] **Step 1: Write a failing frontend wiring assertion**

Assert that successful manual confirmation refreshes both:

- the expanded shared-order detail; and
- the grouped shared-order rows through `loadRows()`.

Also assert that the UI accepts `alreadyConfirmed: true` as a successful response.

- [ ] **Step 2: Verify RED**

Run the route confirmation test. Expected: FAIL because `confirmOrgPayment` refreshes detail only.

- [ ] **Step 3: Update the admin mutation**

After any successful `2xx` confirmation response, call the existing `refreshDetail(shareId)` and `loadRows()`. Preserve the current distinction between mutation failure and post-success refresh failure. No new badges or status fields are added.

- [ ] **Step 4: Verify GREEN**

Run the focused route test. Expected: all assertions pass.

### Task 5: Whole-request verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Build stale shared library declarations first**

Run:

```bash
pnpm run typecheck:libs
```

- [ ] **Step 2: Run focused and related payment tests**

Run:

```bash
pnpm --filter @workspace/api-server test -- \
  src/lib/wholesale-organiser-payment-confirmation.test.ts \
  src/routes/__tests__/wholesale-share-confirmation.test.ts \
  src/lib/order-payment-lock-integrity.test.ts \
  src/lib/shared-order-payment-routing.test.ts \
  src/routes/__tests__/wholesale-share-member-payment-transactions.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 3: Run static checks**

Run:

```bash
pnpm --filter @workspace/api-server run typecheck
git diff --check
```

Report pre-existing typecheck failures separately and verify no failure points to the changed files.

- [ ] **Step 4: Restart the canonical workflow once**

Restart only `Start application`, then inspect workflow and browser logs. Do not restart duplicate API/web workflows alongside the canonical workflow.

- [ ] **Step 5: Confirm runtime health**

Check the frontend and API health endpoints through the Replit development domain and take one app-preview screenshot. Expected: application loads without a manifest error or new browser exception.

- [ ] **Step 6: Review the final diff**

Confirm:

- no member-order bulk update exists;
- no confirmation occurs on wallet setup or payment submission;
- manual and automatic confirmation share one domain operation;
- audit insertion is atomic and transition-only;
- notifications are transition-only;
- backfill is safe and rerunnable;
- transaction details remain organiser/admin scoped.