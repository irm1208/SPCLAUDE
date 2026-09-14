# Refund Queue Payment TXIDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all original and top-up customer payment TXIDs on protected refund cards.

**Architecture:** Extend the protected refund serializer with a normalized `paymentTxids` array sourced from order payment fields, then render that array separately from the outgoing refund TXID. Do not alter customer-safe refund data.

**Tech Stack:** TypeScript, Express, React, Vitest

---

### Task 1: Protected Refund API Contract

**Files:**
- Modify: `artifacts/api-server/src/routes/group-buy-refunds.ts`
- Test: `artifacts/api-server/src/routes/__tests__/group-buy-refunds.test.ts`

- [ ] Add failing list/detail tests for original plus additional payment TXIDs, deduplication, and empty manual-order state.
- [ ] Run the focused API test and confirm RED.
- [ ] Add a server-owned normalized `paymentTxids` array to protected Admin/organiser refund responses.
- [ ] Run the focused API test and confirm GREEN.

### Task 2: Refund Card Display

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.tsx`
- Test: `artifacts/peps-anonymous/src/components/GroupBuyRefundQueue.test.ts`

- [ ] Add failing render tests for all payment TXIDs, the no-TXID state, and separate outgoing `Refund TXID`.
- [ ] Run the focused frontend test and confirm RED.
- [ ] Render `Payment TXID(s)` and the empty state without changing refund actions.
- [ ] Run focused tests, production builds, restart `Start application`, and inspect logs and preview.