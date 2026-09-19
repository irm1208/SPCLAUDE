# Sage Blood-Test Session Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every Sage chat request explicitly carries the blood-test session whose biomarker data should be used.

**Architecture:** Keep the server’s existing authenticated latest-session fallback, but make the web client send the latest/active session ID whenever it has one. Centralize the request-body shape in a small pure helper so all callers include the same field and a regression test locks the contract.

**Tech Stack:** React, TypeScript, TanStack Query, Node’s built-in test runner.

---

### Task 1: Lock the request contract with a failing test

**Files:**
- Create: `artifacts/peps-anonymous/src/lib/sage-discuss-request.ts`
- Create: `artifacts/peps-anonymous/src/lib/sage-discuss-request.test.ts`

- [x] **Step 1: Write the failing test** for a Sage request body that preserves an explicit `sessionId`, message, and history.
- [x] **Step 2: Run the focused test** and confirm it fails because the request helper does not exist yet.

### Task 2: Add the minimal request helper and use it in the reusable hook

**Files:**
- Modify: `artifacts/peps-anonymous/src/lib/sage-discuss-request.ts`
- Modify: `artifacts/peps-anonymous/src/hooks/use-blood-tests.ts`

- [x] **Step 1: Implement the helper** with the exact `{ message, sessionId, history }` request shape.
- [x] **Step 2: Replace the hook’s inline request body** with the helper.
- [x] **Step 3: Run the focused test** and confirm it passes.

### Task 3: Pass the latest session through all Sage entry points

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/SageChat.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/SagePage.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/BloodTests.tsx`
- Modify: `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx`

- [x] **Step 1: Add an optional `sessionId` prop** to `SageChat` and include it in its direct fetch body.
- [x] **Step 2: Load blood tests in `SagePage`** and pass the newest session ID to `SageChat`.
- [x] **Step 3: Pass each Blood Tests/Customer Portal page’s newest session ID** into discuss mutations and the opening-message request.

### Task 4: Verify the complete change

- [x] **Step 1:** Run the focused request-contract test.
- [x] **Step 2:** Run the frontend typecheck and production build.
- [x] **Step 3:** Restart the canonical application workflow and inspect logs.
- [x] **Step 4:** Capture the running Sage page to confirm it remains visually healthy.