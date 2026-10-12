# Group-buy half-kit offers Implementation Plan

> **For agentic workers:** Execute inline with executing-plans; the required design worker handles only frontend work. Steps use checkbox syntax.

**Goal:** Fill actual remaining halves through manually published offers added to existing orders.

**Architecture:** Separate durable offer and claim records, protected order line snapshots, group-stock mutex and row-locked financial changes. Reuse existing account/organiser/Admin authentication, credits ledger and paid-order balance workflow.

**Tech Stack:** Express, Drizzle/PostgreSQL, React/Vite, Vitest.

## 1. Domain rules and persistence
- [ ] Create `artifacts/api-server/src/lib/half-kit-rules.test.ts` before implementation. Test exact `.5` remainders, rejected pending/dispatched orders, gross/net credit arithmetic, and paid-order incremental balances.
  ```ts
  expect(hasRemainingHalf(3.5)).toBe(true);
  expect(hasRemainingHalf(3)).toBe(false);
  expect(claimAmounts(20, 2, 3, 10)).toEqual({ gross: 25, credit: 10, cash: 15 });
  ```
- [ ] Run `pnpm --filter @workspace/api-server exec vitest run src/lib/half-kit-rules.test.ts`; observe missing-module failure, implement the tested rules, then confirm green.
- [ ] Add `lib/db/src/schema/gb_half_kit_offers.ts`, export from schema index, and apply only development schema changes. Offers have unique group/product identity and a version; claims have unique request and line-item identities, immutable monetary snapshots and release history.

## 2. Transactional service and routes
- [ ] Implement `artifacts/api-server/src/lib/half-kit-offers.ts` and `src/routes/half-kit-offers.ts`, register in `src/routes/index.ts`.
- [ ] Acquire group-stock mutex, account credit lock when spending, then target-order lock; check group ownership/membership, current remainder, live version, stock/customer limits and payment/refund/dispatch eligibility.
- [ ] Persist one new `0.5` line, gross order increments, currency-converted credit ledger deduction and incremental balance in the same transaction. Preserve original coupon and paid-payment data. Return the parent order/payment destination on retries.
- [ ] Release only unpaid/non-verifying claims; reverse their exact snapshots once, restore spent credits once, and reopen only a real remainder.
- [ ] Add route/service tests for ownership, stale price, retry, competing claims, credit opt-out and release. Protect claim snapshots from legacy monetary rewrites without blocking payment confirmation or fulfilment.

## 3. Frontend and verification
- [ ] Design worker creates real manager/member components with the agreed API contract, tests, both organiser entry points, Admin entry and member links. Review every edited existing page for accidental deletions.
- [ ] Verify matching payloads, previewed credit amounts, error handling, persistence refresh, target-order selection and balance-payment navigation.
- [ ] Run targeted API/frontend tests and production compile builds. Start only `Start application`, check fresh logs and screenshot the public route/auth boundary. Use API/tests for signed-in workflows; do not bypass auth.
