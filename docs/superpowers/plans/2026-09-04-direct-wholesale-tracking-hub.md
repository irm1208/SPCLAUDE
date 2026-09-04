# Direct Wholesale Tracking Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give customers one opt-in tracking hub for all of their own direct wholesale orders.

**Architecture:** Extend the existing Track17 order cache with conservative special-status normalization. Add one authenticated customer endpoint over direct wholesale orders and reuse the existing Telegram notification preference JSON and notification log. Build a dedicated React page using the existing dashboard visual system.

**Tech Stack:** Express 5, Drizzle/PostgreSQL, Vitest, React 19, Vite, TanStack Query, Wouter, Tailwind.

---

### Task 1: Tracking status classification and wholesale alert delivery

**Files:**
- Modify: `artifacts/api-server/src/lib/tracking-auto-refresh.ts`
- Create: `artifacts/api-server/src/lib/wholesale-tracking.ts`
- Create: `artifacts/api-server/src/lib/wholesale-tracking.test.ts`

- [ ] Write failing tests proving explicit redirected, seized, and return-to-sender events override generic Track17 status while uncertain customs text remains `exception`.
- [ ] Run the focused test and confirm it fails because the classifier is absent.
- [ ] Implement pure status classification and the wholesale alert-status allowlist.
- [ ] Select `orderType` during individual refresh. Preserve existing notifications for non-wholesale orders; for direct wholesale orders notify only when `telegram_notifications.wholesale_tracking === true` and the normalized changed status is delivered, redirected, seized, or return-to-sender.
- [ ] Use the existing `notifyUser` path with preference key `wholesale_tracking` so enabled alerts enter `telegram_message_logs` and the in-app bell.
- [ ] Keep redirected, seized, and return-to-sender orders eligible for later Track17 polling.
- [ ] Run focused tests and API typecheck.

### Task 2: Authenticated wholesale tracking API and preference

**Files:**
- Create: `artifacts/api-server/src/routes/wholesale-tracking.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/routes/telegram.ts`
- Create: `artifacts/api-server/src/routes/__tests__/wholesale-tracking.test.ts`

- [ ] Write failing route tests for authentication, owner scoping, direct `wholesale` filtering, deleted-order exclusion, and default-off preference behavior.
- [ ] Run the route test and confirm it fails because the route is absent.
- [ ] Add `GET /api/account/wholesale-tracking`, deriving the normalized username from `req.account`.
- [ ] Return alert state and direct wholesale order tracking summaries with unique tracking numbers, cached status/events, and last-check timestamp.
- [ ] Add `wholesale_tracking` to Telegram preference validation and expose it with default `false`.
- [ ] Run route tests and API typecheck.

### Task 3: Wholesale tracking page and navigation

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/WholesaleTracking.tsx`
- Modify: `artifacts/peps-anonymous/src/App.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/AccountOrders.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/WholesaleOrder.tsx`
- Modify: `artifacts/peps-anonymous/src/hooks/use-account.ts`
- Create: `artifacts/peps-anonymous/src/pages/wholesale-tracking.test.mjs`

- [ ] Write a failing source/UI contract test for `/wholesale/tracking`, both entry links, filters, empty/error states, and the opt-in mutation.
- [ ] Run it and confirm the page and route are absent.
- [ ] Add typed TanStack Query hooks for the tracking endpoint and alert preference mutation.
- [ ] Build the page with summary, filters, accessible alert switch, order cards, latest events, and order-detail links; exclude shared-order concepts and do not use emojis.
- [ ] Add links from My Orders and the direct Wholesale Order page.
- [ ] Run frontend tests, typecheck, and production build.

### Task 4: Whole-feature verification

**Files:**
- Review all files above.

- [ ] Run all focused API and frontend tests.
- [ ] Run API and frontend typechecks.
- [ ] Run the frontend production build.
- [ ] Restart only the canonical `Start application` workflow and inspect workflow/browser logs.
- [ ] Capture `/wholesale/tracking` and verify the unauthenticated state is safe and the page is not manifestly broken.