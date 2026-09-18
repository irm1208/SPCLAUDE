# Group-buy organiser reassignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins assign any group buy to an approved organiser or return it to Admin ownership without changing the group buy’s business data.

**Architecture:** Extend the existing organiser-admin router with a dedicated ownership mutation and include unassigned group buys in its admin list. Add a controlled selector to the existing Admin organiser group-buy tab, reusing the already-loaded approved organiser accounts and updating the local row from the mutation response.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, Vitest, React, TypeScript, Tailwind CSS.

---

### Task 1: Lock down the reassignment contract with a failing test

**Files:**
- Create: `artifacts/api-server/src/routes/__tests__/group-buy-organiser-reassignment.test.ts`

- [ ] **Step 1: Write the failing source-contract tests**

Assert that the organiser-admin router exposes the ownership PATCH route, validates approved accounts, allows explicit `null`, writes the organiser audit log, and lists unassigned group buys. Assert that the admin page calls the ownership route and renders an organiser selector.

- [ ] **Step 2: Run the focused test**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-organiser-reassignment.test.ts`

Expected: FAIL because the route and selector do not exist yet.

### Task 2: Implement the admin reassignment endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/organiser-admin.ts`

- [ ] **Step 1: Add the admin-only PATCH route**

Load the group buy by id, normalize the requested username, resolve the account case-insensitively, require `organiserStatus === "approved"`, update only `groupBuysTable.organiserId`, and record the old/new ownership in `organiserAuditLogTable`. Return the updated id, name, and organiser.

- [ ] **Step 2: Include unassigned group buys in the admin list**

Remove the list-only `isNotNull(groupBuysTable.organiserId)` filter. Leave the existing organiser-specific routes unchanged.

- [ ] **Step 3: Run the focused test**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-organiser-reassignment.test.ts`

Expected: PASS.

### Task 3: Add the admin UI control

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`

- [ ] **Step 1: Add reassignment state and mutation**

Track the selected organiser and saving row, send `{ organiserUsername }` with explicit `null` for Admin ownership, handle server errors, and patch the local GB row from the response.

- [ ] **Step 2: Render the selector**

Show the current owner, an `Admin (unassigned)` option, and approved organisers in the existing group-buy cards. Keep the control independent from approval actions and other GB settings.

- [ ] **Step 3: Extend the frontend contract test**

Assert that the selector uses the reassignment endpoint and explicit null payload.

- [ ] **Step 4: Run frontend typecheck and focused tests**

Run: `pnpm --filter @workspace/peps-anonymous run typecheck` and `pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/group-buy-organiser-reassignment.test.ts`.

Expected: PASS.

### Task 4: Verify the complete change

**Files:**
- No additional files.

- [ ] **Step 1: Run the API test suite**

Run: `pnpm --filter @workspace/api-server test`

- [ ] **Step 2: Build the frontend**

Run: `pnpm --filter @workspace/peps-anonymous run build`

- [ ] **Step 3: Restart the canonical workflow and inspect logs**

Restart `Start application`, then refresh workflow and browser logs to confirm the app starts without route or bundle errors.