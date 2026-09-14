# Paid Manual Order Refunds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every confirmed paid group-buy order request a refund using its current order total, regardless of original transaction evidence.

**Architecture:** Separate confirmed-paid refund eligibility from incoming-payment verification. Use one server-owned eligibility function for both customer visibility and request creation, snapshot the locked current `grandTotal`, and retain the existing processor authorization and terminal-state safeguards.

**Tech Stack:** TypeScript, Express, Drizzle ORM, Vitest, React/Vite

---

### Task 1: Confirmed-Paid Eligibility

**Files:**
- Modify: `artifacts/api-server/src/lib/refund-eligibility.ts`
- Test: `artifacts/api-server/src/lib/refund-eligibility.test.ts`

- [ ] Add failing tests proving a confirmed manual order without a transaction hash is eligible and an Admin-edited order returns its current `grandTotal`.
- [ ] Run `pnpm --dir artifacts/api-server exec vitest run src/lib/refund-eligibility.test.ts` and verify the new manual-order test fails with `ineligible_payment_evidence`.
- [ ] Remove payment-evidence checks from the shared confirmed-paid eligibility predicate while retaining `paymentStatus === "confirmed"` and `paymentConfirmedAt`.
- [ ] Run the focused test and verify all eligibility cases pass.

### Task 2: Request Creation and Completion

**Files:**
- Modify: `artifacts/api-server/src/lib/group-buy-refund.ts`
- Test: `artifacts/api-server/src/lib/group-buy-refund.test.ts`
- Test: `artifacts/api-server/src/lib/group-buy-refund-crypto.test.ts`

- [ ] Add failing transactional tests proving a hashless confirmed order can create a request and complete through both credit and crypto processing.
- [ ] Add a regression proving request creation snapshots the locked current `grandTotal` after an Admin quantity/total edit.
- [ ] Run the focused refund tests and verify they fail on original-payment proof loading.
- [ ] Remove original incoming-payment proof as a request/completion prerequisite. Keep locked ownership, confirmed payment state, positive current total, duplicate request prevention, processor scope, refund amount snapshot, and terminal-state checks.
- [ ] Run all focused refund tests and verify they pass.

### Task 3: Contract and Application Verification

**Files:**
- Verify: `artifacts/api-server/src/lib/customer-refund-view.ts`
- Verify: `artifacts/peps-anonymous/src/components/CustomerRefundPanel.tsx`

- [ ] Verify the customer view exposes `canRequest: true` for a confirmed hashless order and the panel uses the API order’s current total.
- [ ] Run `pnpm --filter @workspace/api-server run build:compile`.
- [ ] Run `pnpm --filter @workspace/peps-anonymous run build`.
- [ ] Restart only `Start application`, inspect logs, and screenshot the rendered app.