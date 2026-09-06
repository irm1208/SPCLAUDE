# Admin-Only Optional 2FA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional authenticator-app 2FA exclusively to the Peps admin backend, including FS3 and sensitive admin mutations, while retaining shared `ADMIN_SECRET` authentication whenever 2FA is disabled.

**Architecture:** PostgreSQL stores named administrators, hashed recovery codes, opaque hashed sessions, and the authoritative enabled/disabled mode. A single mode-aware middleware protects admin routes: disabled mode validates only `ADMIN_SECRET`; enabled mode validates only a secure admin session. TOTP and fresh step-up challenges are verified server-side and the React admin page switches between shared-secret, enrolment, password/TOTP login, and step-up UI.

**Tech Stack:** TypeScript, Express, React/Vite, PostgreSQL/Drizzle, Node `crypto`, bcryptjs, Vitest.

---

### Task 1: Persist admin identities and sessions

**Files:**
- Create: `lib/db/src/schema/admin_security.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `artifacts/api-server/src/index.ts`
- Test: `artifacts/api-server/src/startup-migrations.test.ts`

- [ ] **Step 1: Write failing migration/schema tests**

Assert startup SQL creates `admin_security_settings`, `admin_users`, `admin_recovery_codes`, `admin_sessions`, and `admin_pending_challenges`, with unique usernames, foreign keys, expiries, revocation fields, `last_totp_step`, and indexes for token hashes.

- [ ] **Step 2: Run the migration test and confirm it fails because the tables are absent**

Run: `pnpm --filter @workspace/api-server test -- src/startup-migrations.test.ts`

- [ ] **Step 3: Add matching Drizzle tables and idempotent startup SQL**

Use a singleton settings row defaulting to disabled. Store password hashes, encrypted TOTP secrets, recovery-code hashes, session-token hashes, pending-challenge hashes, expiry/revocation timestamps, CSRF token hashes, and reusable step-up timestamps. Never store raw session, CSRF, recovery, or challenge tokens.

- [ ] **Step 4: Build database declarations and rerun the migration test**

Run: `pnpm typecheck:libs && pnpm --filter @workspace/api-server test -- src/startup-migrations.test.ts`

### Task 2: Implement cryptographic 2FA primitives

**Files:**
- Create: `artifacts/api-server/src/lib/admin-2fa.ts`
- Test: `artifacts/api-server/src/lib/admin-2fa.test.ts`

- [ ] **Step 1: Write failing tests**

Cover RFC 6238 six-digit SHA-1 TOTP vectors, base32 encoding/decoding, ±1 time-step verification, replay rejection inputs, AES-256-GCM encryption/decryption with domain-separated key derivation, opaque token hashing, recovery-code generation/hash verification, and generic invalid input.

- [ ] **Step 2: Confirm the tests fail before implementation**

Run: `pnpm --filter @workspace/api-server test -- src/lib/admin-2fa.test.ts`

- [ ] **Step 3: Implement the minimal primitives with Node crypto**

Use constant-time comparisons, `randomBytes`, SHA-256 token hashes, AES-256-GCM, and bcryptjs for passwords/recovery codes. Derive the TOTP encryption key from `ADMIN_TOTP_ENCRYPTION_KEY`; allow a domain-separated `SESSION_SECRET` fallback only so existing deployments can start, and log a warning without exposing values.

- [ ] **Step 4: Rerun focused tests**

Run: `pnpm --filter @workspace/api-server test -- src/lib/admin-2fa.test.ts`

### Task 3: Add mode-aware admin authentication APIs and middleware

**Files:**
- Modify: `artifacts/api-server/src/middleware/require-admin.ts`
- Create: `artifacts/api-server/src/routes/admin-auth.ts`
- Test: `artifacts/api-server/src/routes/admin-auth.test.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`

- [ ] **Step 1: Write failing route and middleware tests**

Cover public status, enable-start, enable-confirm, password login, TOTP/recovery completion, logout, session expiry/revocation, CSRF, disable, disabled-mode shared-secret access, enabled-mode rejection of `x-admin-secret`, TOTP replay, and generic auth errors.

- [ ] **Step 2: Confirm focused tests fail**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin-auth.test.ts`

- [ ] **Step 3: Implement auth services and routes**

Expose `/admin/security/status`, `/admin/security/enable/start`, `/admin/security/enable/confirm`, `/admin/auth/login`, `/admin/auth/verify`, `/admin/auth/logout`, `/admin/auth/me`, `/admin/auth/step-up`, `/admin/security/disable`, and recovery-code regeneration. Enable only after confirmed TOTP; disable only after fresh TOTP and atomically revoke all sessions.

- [ ] **Step 4: Centralize authorization**

Make `requireAdmin` mode-aware. Disabled mode validates the existing shared secret. Enabled mode validates only the opaque HTTP-only session, active named administrator, expiry, and revocation. Mutations validate Origin/Referer plus `x-admin-csrf`. Remove duplicate auth-check failure logging and expose authenticated admin identity to audit code.

- [ ] **Step 5: Rerun tests**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin-auth.test.ts`

### Task 4: Enforce step-up on sensitive and FS3 mutations

**Files:**
- Modify: `artifacts/api-server/src/middleware/require-admin.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Modify: `artifacts/api-server/src/routes/group-buys-admin.ts`
- Modify: `artifacts/api-server/src/routes/config.ts`
- Modify: `artifacts/api-server/src/routes/payments.ts`
- Test: `artifacts/api-server/src/routes/admin-step-up.test.ts`

- [ ] **Step 1: Write failing authorization tests**

Prove enabled-mode sessions without recent step-up receive `403 { error: "step_up_required" }` for FS3 cost writes/deletes, FS3 submission, FS3 reminders, wallet destinations, roles/fees, webhooks, AI/security settings, and destructive group-buy changes. Prove disabled mode retains shared-secret behavior.

- [ ] **Step 2: Confirm tests fail before middleware is applied**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin-step-up.test.ts`

- [ ] **Step 3: Implement reusable and single-use step-up**

Add `requireAdminStepUp` with a 10-minute session-bound window and action-bound single-use assertions for wallet/security/disable operations. Apply it at central route boundaries or explicit route declarations so duplicate FS3 mounts cannot bypass it.

- [ ] **Step 4: Rerun focused and full API tests**

Run: `pnpm --filter @workspace/api-server test -- src/routes/admin-step-up.test.ts && pnpm --filter @workspace/api-server test`

### Task 5: Build the admin enrolment, login, toggle, and step-up UI

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`
- Create: `artifacts/peps-anonymous/src/lib/admin-auth.ts`
- Test: `artifacts/peps-anonymous/src/lib/admin-auth.test.ts`

- [ ] **Step 1: Write failing client-state/API tests**

Cover disabled shared-secret mode, enable enrolment, password then TOTP login, recovery-code login, credentials-included requests, CSRF header attachment, session expiry, step-up retry once, and disable transition.

- [ ] **Step 2: Confirm focused tests fail**

Run: `pnpm --filter @workspace/peps-anonymous test -- src/lib/admin-auth.test.ts`

- [ ] **Step 3: Implement the shared admin API client**

Fetch server auth mode, include cookies, attach CSRF to mutations, retain the admin secret only in disabled mode, expose a single request helper for admin components, and support one step-up/retry cycle.

- [ ] **Step 4: Implement UI flows**

Add username/password and authenticator/recovery login, enrolment URI and manual key display, one-time recovery-code download/copy, Admin Security enable/disable control, session logout, and step-up dialog. Remove the FS3 static-password gate when 2FA mode is enabled; FS3 follows the active admin mode.

- [ ] **Step 5: Verify frontend and complete system**

Run:

```bash
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous typecheck
pnpm --filter @workspace/api-server test
pnpm typecheck:libs
```

Restart `Start application`, inspect logs, and verify disabled login, enrolment, enabled login, FS3 read, step-up mutation rejection, step-up success, logout, and disable in the development preview.
