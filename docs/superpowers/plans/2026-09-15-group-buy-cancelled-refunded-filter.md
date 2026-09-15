# Group-buy Cancelled/Refunded Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one combined Cancelled/Refunded filter to the Admin and organiser group-buy Orders views.

**Architecture:** Put the cross-view matching rule in a small shared frontend helper that accepts the common `status` and `paymentStatus` fields. Both existing filter pipelines call that helper, preventing their behavior from drifting.

**Tech Stack:** TypeScript, React, Vitest, Vite.

---

### Task 1: Shared matching rule

**Files:**
- Create: `artifacts/peps-anonymous/src/lib/group-buy-order-filters.ts`
- Create: `artifacts/peps-anonymous/src/lib/group-buy-order-filters.test.ts`

- [ ] **Step 1: Write the failing test**

Test that `matchesCancelledOrRefunded` returns true for order status `Cancelled`, payment status `refunded`, and case variants; test that an ordinary paid order returns false.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/peps-anonymous exec vitest run src/lib/group-buy-order-filters.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Write minimal implementation**

Normalize both nullable status strings with `trim().toLowerCase()` and return true when order status equals `cancelled` or payment status equals `refunded`.

- [ ] **Step 4: Run test to verify it passes**

Run the command from Step 2.

Expected: PASS.

### Task 2: Admin Orders filter

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/OrdersPanel.tsx`

- [ ] **Step 1: Add the combined filter branch**

Import the shared helper and include it when `paymentStatusFilter === "cancelled_refunded"`.

- [ ] **Step 2: Add the chip and count**

Add a `Cancelled/Refunded` chip whose count uses the same shared helper.

### Task 3: Organiser Orders filter

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx`

- [ ] **Step 1: Add the combined filter branch**

Import the shared helper and use it when `filter === "cancelled_refunded"`.

- [ ] **Step 2: Add desktop and mobile controls**

Add `Cancelled/Refunded` to both the desktop status pills and mobile status dropdown.

### Task 4: Verification

- [ ] **Step 1: Run focused tests**

Run the shared helper test and existing refund queue tests.

- [ ] **Step 2: Build production frontend**

Run: `pnpm --filter @workspace/peps-anonymous run build`

Expected: Vite exits successfully.

- [ ] **Step 3: Check patch formatting**

Run: `git diff --check`

Expected: no output.