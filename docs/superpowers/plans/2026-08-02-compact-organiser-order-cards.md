# Compact GB Organiser V2 Order Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GB Organiser V2 order table and mobile cards with compact summaries that open the existing full order drawer.

**Architecture:** Add one focused `CompactOrderList` component shared by desktop and mobile. Keep filtering, selection, bulk actions, repository data, and the existing quick-view drawer in `OrdersTab`.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Node test runner

---

### Task 1: Define and verify the compact summary contract

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/compact-order-cards.test.mjs`

- [ ] Write a source contract test that requires `CompactOrderList`, the four fields, quantity aggregation, quick-view click behavior, and use from desktop and mobile.
- [ ] Run `node --test artifacts/peps-anonymous/src/pages/organiser-v2/compact-order-cards.test.mjs` and confirm it fails because the component does not exist.

### Task 2: Implement the shared compact order list

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/organiser-v2/CompactOrderList.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/approved-orders.css`

- [ ] Render username, summed quantity, formatted total, and formatted creation date.
- [ ] Make the summary a semantic button that calls `onOpenOrder`.
- [ ] Keep optional selection controls separate from the summary button.
- [ ] Add dense desktop and responsive mobile styling with visible focus states.

### Task 3: Wire desktop and mobile to the shared list

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersTab.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/organiser-v2/OrdersMobileWorkspace.tsx`

- [ ] Replace the desktop Atlas table with `CompactOrderList`.
- [ ] Replace the mobile card markup with `CompactOrderList`.
- [ ] Keep filtering, selection, bulk actions, and empty states.
- [ ] Expand the drawer payment section to preserve payment status, paid date, and proof.

### Task 4: Verify behavior and build

**Files:**
- Test: `artifacts/peps-anonymous/src/pages/organiser-v2/compact-order-cards.test.mjs`

- [ ] Run the compact-card contract test and relevant order model tests.
- [ ] Run `pnpm --filter @workspace/peps-anonymous run build`.
- [ ] Restart the canonical `Start application` workflow and inspect logs.