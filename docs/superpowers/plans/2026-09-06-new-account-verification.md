# New Account Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every new account to pass Cloudflare Turnstile and then verify either email or Telegram before receiving full account access, without affecting existing accounts.

**Architecture:** Store nullable verification-policy state on accounts and hashed email challenges in a focused table. Split JWT identity validation from verified-account authorization so restricted sessions can access only verification endpoints. Reuse Resend and the existing Telegram link flow, and route restricted users into a dedicated React verification screen.

**Tech Stack:** TypeScript, Express, React/Vite, PostgreSQL/Drizzle, JSON Web Tokens, Resend, Cloudflare Turnstile.

---

## File Structure

- `lib/db/src/schema/accounts.ts` — nullable account verification columns.
- `lib/db/src/schema/account_verification.ts` — hashed email verification challenges and indexes.
- `lib/db/src/schema/index.ts` — schema exports.
- `artifacts/api-server/src/lib/account-verification.ts` — verification state, code hashing, challenge lifecycle, and account activation.
- `artifacts/api-server/src/lib/turnstile.ts` — isolated Cloudflare token verifier.
- `artifacts/api-server/src/middleware/account-auth.ts` — identity-only and verified-account middleware; restricted JWT claims.
- `artifacts/api-server/src/routes/account-verification.ts` — verification status, email confirmation/resend, and completion endpoints.
- `artifacts/api-server/src/routes/account.ts` — signup/login integration only.
- `artifacts/api-server/src/routes/vial-shop.ts` — seller signup CAPTCHA and restricted-session integration.
- `artifacts/api-server/src/routes/wholesale-shares.ts` — wholesale-invite signup CAPTCHA and restricted-session integration.
- `artifacts/api-server/src/routes/telegram.ts` — complete verification when a restricted account links Telegram.
- `artifacts/api-server/src/routes/discord.ts` and `artifacts/api-server/src/routes/admin.ts` — preserve restricted state when issuing account cookies.
- `artifacts/api-server/src/routes/index.ts` — mount verification routes.
- `artifacts/api-server/src/lib/account-verification.test.ts` — service and policy tests.
- `artifacts/api-server/src/routes/account-verification.test.ts` — route and authorization tests.
- `artifacts/peps-anonymous/src/hooks/use-account.ts` — verification status in account bootstrap.
- `artifacts/peps-anonymous/src/pages/Login.tsx` — Turnstile signup submission and restricted-session transition.
- `artifacts/peps-anonymous/src/pages/AccountVerification.tsx` — email-or-Telegram verification UI.
- `artifacts/peps-anonymous/src/App.tsx` — restricted-session route.
- `artifacts/peps-anonymous/src/lib/account-verification.test.ts` — frontend contract tests.

### Task 1: Persist verification policy and email challenges

**Files:**
- Modify: `lib/db/src/schema/accounts.ts`
- Create: `lib/db/src/schema/account_verification.ts`
- Modify: `lib/db/src/schema/index.ts`
- Create: `artifacts/api-server/src/lib/account-verification.ts`
- Create: `artifacts/api-server/src/lib/account-verification.test.ts`

- [ ] **Step 1: Write failing service tests**

Cover these concrete cases:

```ts
expect(needsVerification({ verificationRequiredAt: null, verifiedAt: null })).toBe(false);
expect(needsVerification({ verificationRequiredAt: new Date(), verifiedAt: null })).toBe(true);
expect(needsVerification({ verificationRequiredAt: new Date(), verifiedAt: new Date() })).toBe(false);
expect(hashEmailCode("123456")).not.toContain("123456");
expect(canResend({ lastSentAt: new Date() }, now)).toEqual({ allowed: false, retryAfterSeconds: 60 });
```

Also test fifteen-minute expiry, five-attempt consumption, single-use confirmation, and that either `email` or `telegram` completion sets `verifiedAt` and `verificationMethod`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/account-verification.test.ts
```

Expected: failure because the schema and service do not exist.

- [ ] **Step 3: Add additive Drizzle schema**

Add nullable columns to `accountsTable`:

```ts
verificationRequiredAt: timestamp("verification_required_at", { withTimezone: true }),
verifiedAt: timestamp("verified_at", { withTimezone: true }),
verificationMethod: text("verification_method"),
emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
```

Create `account_email_verification_challenges` with UUID id, account username FK, SHA-256 code hash, `expiresAt`, `attemptCount`, `consumedAt`, `lastSentAt`, `createdAt`, and an index on account username plus active expiry.

- [ ] **Step 4: Implement the focused service**

Export:

```ts
needsVerification(account)
createEmailChallenge(tx, telegramUsername)
confirmEmailChallenge(tx, telegramUsername, code)
completeAccountVerification(tx, telegramUsername, method)
getAccountVerificationState(telegramUsername)
```

Generate codes with `randomInt(0, 1_000_000).toString().padStart(6, "0")`, store only SHA-256 hashes, expire after fifteen minutes, cap attempts at five, and invalidate prior active challenges on resend or completion.

- [ ] **Step 5: Apply development schema and verify GREEN**

Use the project’s normal Drizzle development schema sync. Confirm the publish diff is additive only. Re-run the focused tests and commit.

### Task 2: Add Turnstile verification and restricted account sessions

**Files:**
- Create: `artifacts/api-server/src/lib/turnstile.ts`
- Modify: `artifacts/api-server/src/middleware/account-auth.ts`
- Create: `artifacts/api-server/src/routes/account-verification.ts`
- Create: `artifacts/api-server/src/routes/account-verification.test.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Write failing authorization and Turnstile tests**

Test that:

```ts
await expect(verifyTurnstileToken("", ip)).resolves.toEqual({ success: false });
expect(restrictedJwt.verificationRequired).toBe(true);
```

A restricted JWT must receive `403 { error: "verification_required" }` from normal `requireAccount`, while identity-only middleware permits status, confirm, resend, Telegram link-init/status, and logout routes.

- [ ] **Step 2: Run tests and verify RED**

Run the new route test and expect missing exports/routes.

- [ ] **Step 3: Implement Turnstile verifier**

POST URL-encoded data to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `TURNSTILE_SECRET_KEY`, response token, and optional remote IP. Use Cloudflare test credentials in tests/development; production fails closed when the key is absent.

- [ ] **Step 4: Split account authorization**

Keep token verification, abuse-name blocking, and JTI revocation in an exported identity middleware. Make `requireAccount` additionally reject JWTs carrying `verificationRequired: true`. Extend `issueAccountCookie` to accept `{ verificationRequired?: boolean }`, defaulting to false only when the caller has already resolved account state.

- [ ] **Step 5: Add verification routes**

Implement:

```text
GET  /api/account/verification/status
POST /api/account/verification/email/resend
POST /api/account/verification/email/confirm
POST /api/account/verification/session/upgrade
```

Status returns `required`, `verified`, `emailMasked`, `emailVerified`, `telegramLinked`, `availableMethods`, and resend timing. Successful email or Telegram completion issues an unrestricted replacement cookie.

- [ ] **Step 6: Verify GREEN and commit**

Run focused route/service tests, then the complete API suite.

### Task 3: Enforce CAPTCHA and restricted state across every entry point

**Files:**
- Modify: `artifacts/api-server/src/routes/account.ts`
- Modify: `artifacts/api-server/src/routes/vial-shop.ts`
- Modify: `artifacts/api-server/src/routes/wholesale-shares.ts`
- Modify: `artifacts/api-server/src/routes/discord.ts`
- Modify: `artifacts/api-server/src/routes/telegram.ts`
- Modify: `artifacts/api-server/src/routes/admin.ts`
- Modify: `artifacts/api-server/src/lib/registration-abuse.test.ts`

- [ ] **Step 1: Write failing route-source and behavior tests**

Require all public account-creation paths to call `verifyTurnstileToken` before account or invite writes. Require every cookie issuance after login, Discord, Telegram Mini App, order login, and admin impersonation to resolve the account’s verification state and preserve the restricted claim.

- [ ] **Step 2: Run tests and verify RED**

Run registration-abuse and account-verification route tests. Expected: missing Turnstile and cookie-state calls.

- [ ] **Step 3: Integrate signup transaction**

For normal, seller, and wholesale-invite registration:

1. Validate Turnstile first.
2. Insert account with `verificationRequiredAt = now`.
3. Create and send the email challenge.
4. Issue restricted session.
5. Return `{ ok: true, verificationRequired: true }`.

Ensure invalid CAPTCHA performs no account insert and no invite-code increment.

- [ ] **Step 4: Preserve restriction on every login**

Before each `issueAccountCookie`, resolve:

```ts
verificationRequiredAt !== null && verifiedAt === null
```

Pass this as the JWT restricted claim. Grandfathered rows with null `verificationRequiredAt` remain unrestricted.

- [ ] **Step 5: Complete via Telegram**

In both Telegram link completion paths, call `completeAccountVerification(..., "telegram")` in the same transaction that binds the Telegram identity. Mini App login must preserve restricted state until a real account-link completion exists.

- [ ] **Step 6: Verify all entry points and commit**

Run the complete API suite and a signed restricted-cookie curl check against a normal protected route and each verification route.

### Task 4: Build the CAPTCHA signup and email-or-Telegram verification UI

**Files:**
- Modify: `artifacts/peps-anonymous/src/hooks/use-account.ts`
- Modify: `artifacts/peps-anonymous/src/pages/Login.tsx`
- Create: `artifacts/peps-anonymous/src/pages/AccountVerification.tsx`
- Modify: `artifacts/peps-anonymous/src/App.tsx`
- Create: `artifacts/peps-anonymous/src/lib/account-verification.test.ts`

- [ ] **Step 1: Delegate the verification screen implementation**

Provide the design worker the existing login page, theme CSS, account hook, API contracts, Peps brand guidance, and the approved spec. Require real API calls, no placeholders, no emojis, accessible labels, keyboard submission, mobile responsiveness, and both email and Telegram completion paths.

- [ ] **Step 2: Write failing frontend contract tests**

Verify signup sends `turnstileToken`, restricted responses navigate to `/verify-account`, account bootstrap preserves `verificationRequired`, and both completion methods refresh account state before navigating to `/account`.

- [ ] **Step 3: Run tests and verify RED**

Run the focused frontend test and expect missing route/component behavior.

- [ ] **Step 4: Integrate Turnstile**

Load the official Turnstile script once, render it only on signup, reset it after failure/expiry, and disable signup until a token exists. Read the public site key from `VITE_TURNSTILE_SITE_KEY`.

- [ ] **Step 5: Integrate restricted routing**

Do not render the normal customer portal when account bootstrap reports verification required. Route to `/verify-account`, show email and Telegram as alternatives, and allow logout.

- [ ] **Step 6: Verify frontend behavior and commit**

Run focused tests, frontend typecheck/build, and browser screenshots at desktop and mobile widths.

### Task 5: Configure secrets, audit the complete system, and prepare publishing

**Files:**
- Modify only if needed: email template seed/configuration files
- Modify: relevant tests discovered during implementation

- [ ] **Step 1: Configure Turnstile safely**

Use Replit Secrets for `TURNSTILE_SECRET_KEY` and environment configuration for `VITE_TURNSTILE_SITE_KEY`. Never paste either value into code, logs, chat, or committed files. Restart only the canonical `Start application` workflow after configuration.

- [ ] **Step 2: Verify the email template**

Confirm the DB-driven `email_verification` template sends the six-digit `code` and `username`. Do not replace the existing Resend integration.

- [ ] **Step 3: Run complete verification**

Run:

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous build
git diff --check
```

Run library typecheck before artifact typecheck if schema declarations are stale. Record any unrelated baseline type failures separately.

- [ ] **Step 4: Perform browser and API smoke checks**

Verify:

- Existing account still reaches the portal.
- New account cannot be created without CAPTCHA.
- New account receives restricted session after CAPTCHA.
- Email code alone unlocks the account.
- Telegram link alone unlocks a separate account.
- Restricted account cannot apply for organiser/reshipper or access protected routes.
- Known abusive names remain blocked.
- Reloading and logging back in preserve correct verification state.

- [ ] **Step 5: Review and publish**

Run spec-compliance review and code-quality/security review. Confirm the production migration preview is additive only, then ask the user to publish.