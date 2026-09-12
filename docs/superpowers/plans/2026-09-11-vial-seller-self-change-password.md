# Vial Seller Self-Service Password Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated Vial Shop seller change their password from the Profile tab and sign out every seller session afterward.

**Architecture:** Add a seller-authenticated endpoint that verifies the submitted current password, validates and stores a new hash, clears reset-code state, and audits the action. Add a controlled form to `StoreProfileTab`; after success it clears the persisted seller session and invokes the dashboard logout flow.

**Tech Stack:** Express, Drizzle ORM, React, TypeScript, Vitest, Vite.

---

### Task 1: Seller-authenticated password-change API

**Files:**
- Create: `artifacts/api-server/src/routes/vial-seller-change-password.test.ts`
- Modify: `artifacts/api-server/src/routes/vial-shop.ts`

- [ ] Write a failing behavioral test for `PUT /vial/seller/password` covering missing seller authentication, incorrect current password, short or unchanged new password, successful hash/reset-code replacement, password-free audit logging, and rejection of the old seller token after success.
- [ ] Run `pnpm --filter @workspace/api-server exec vitest run src/routes/vial-seller-change-password.test.ts` and confirm RED because the route is absent.
- [ ] Implement the route using `requireSeller`, `hashPassword`, and `safeCompare`. Accept `{ currentPassword, newPassword }`, require an eight-character new password, reject an unchanged password, update only the authenticated vendor, clear reset-code fields, and emit `seller_password_changed`.
- [ ] Re-run the targeted test and confirm GREEN.

### Task 2: Seller Dashboard change-password form

**Files:**
- Create or modify: `artifacts/peps-anonymous/src/pages/SellerDashboard.test.ts`
- Modify: `artifacts/peps-anonymous/src/pages/SellerDashboard.tsx`

- [ ] Write a failing regression test for three masked fields, matching/minimum validation, the authenticated request contract, disabled saving state, safe feedback, and logout after success.
- [ ] Run `pnpm --filter @workspace/peps-anonymous exec vitest run src/pages/SellerDashboard.test.ts` and confirm RED.
- [ ] Pass an `onPasswordChanged` callback from the dashboard into `StoreProfileTab`. Add controlled current/new/confirmation fields to the Profile tab and submit `{ currentPassword, newPassword }` to `PUT /api/vial/seller/password`.
- [ ] On success, clear all password fields, call the existing logout/session-clearing flow, and display a password-changed confirmation on the login screen. Do not log out on validation, network, or server failure.
- [ ] Re-run the targeted test and confirm GREEN.

### Task 3: Review and verification

- [ ] Run independent spec-compliance and code-quality/security reviews.
- [ ] Run both targeted test files.
- [ ] Run `pnpm --filter @workspace/api-server run build:compile`.
- [ ] Run `pnpm --filter @workspace/peps-anonymous run build`.
- [ ] Restart only the canonical `Start application` workflow and confirm application readiness.
