# Admin Manual Crypto Refund Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an audited Admin-only manual override for completing crypto group-buy refunds with an outgoing TXID.

**Architecture:** Add a dedicated Admin route and service entrypoint that bypasses provider verification only. Reuse or extract the locked crypto-completion transaction so replay claims, terminal guards, refund/order writes, audit outbox, and customer notifications stay identical to verified completion.

**Tech Stack:** TypeScript, Express, Drizzle/Postgres, React, Vitest

---

### Task 1: Manual completion service

**Files:**
- Modify: `artifacts/api-server/src/lib/group-buy-refund.ts`
- Test: `artifacts/api-server/src/lib/group-buy-refund-crypto.test.ts`
- Test: `artifacts/api-server/src/lib/refund-transition-atomicity.test.ts`

- [ ] Add failing tests for Admin-only invocation, required TXID/reason, verifier bypass, replay protection, idempotency, terminal guards, stuck-verifying supersession, and atomic completion/audit/notification.
- [ ] Implement the smallest shared locked completion primitive and manual service entrypoint.
- [ ] Run focused service tests green.

### Task 2: Admin route

**Files:**
- Modify: `artifacts/api-server/src/routes/group-buy-refunds.ts`
- Test: `artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts`

- [ ] Add failing Admin route tests and prove no organiser route exists.
- [ ] Add `POST /api/admin/group-buy-refunds/:refundId/manual-complete` accepting only `txid` and `reason`.
- [ ] Run focused route tests green.

### Task 3: Admin card control

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.tsx`
- Test: `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.test.ts`

- [ ] Add failing tests for Admin-only controls, required reason/TXID, warning, request payload, and refresh.
- [ ] Implement the manual override UI without changing organiser or normal verification behavior.
- [ ] Run frontend tests and production builds, review, restart the canonical workflow, and inspect logs/preview.