# Seller Signup Turnstile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Lonely Vial seller registration complete the existing mandatory Turnstile challenge and send its token to the API.

**Architecture:** Add a focused seller-signup request builder that enforces the CAPTCHA request contract. Reuse the Login page's explicit Turnstile widget lifecycle in `SignupForm`, with fail-closed site-key resolution, retry UI, token expiry handling, and widget reset after rejected requests.

**Tech Stack:** React 19, TypeScript, Vite, Cloudflare Turnstile, Node test runner

---

### Task 1: Define the seller signup request contract

**Files:**
- Create: `artifacts/peps-anonymous/src/lib/seller-signup.ts`
- Create: `artifacts/peps-anonymous/src/lib/seller-signup.test.ts`

- [ ] **Step 1: Write the failing test**

Test that building a seller registration body without a Turnstile token throws and that a valid token is trimmed and included as `turnstileToken`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/peps-anonymous exec tsx --test src/lib/seller-signup.test.ts`

Expected: FAIL because `seller-signup.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create typed form/body interfaces and `buildSellerSignupBody(form, turnstileToken)`. Reject a blank token, normalize optional values to `null`, remove a leading Telegram `@`, and return the API body with `turnstileToken`.

- [ ] **Step 4: Run test to verify it passes**

Run the focused test again and expect PASS.

### Task 2: Add Turnstile to the seller application form

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/SellerDashboard.tsx`

- [ ] **Step 1: Add widget state and lifecycle**

Import `useRef`, `resolveTurnstileSiteKey`, and `buildSellerSignupBody`. Mirror Login's explicit Turnstile loading, callback, expiry/error clearing, cleanup, and retry behavior.

- [ ] **Step 2: Enforce the client request contract**

Block submission without a valid site key/token, submit the helper-built body, and reset the widget/token after non-success responses or connection failures.

- [ ] **Step 3: Render states**

Place the widget above the submit button. Show clear load/unavailable errors, offer retry after load failure, and disable submission until CAPTCHA is complete.

### Task 3: Verify the complete change

**Files:**
- Test: `artifacts/peps-anonymous/src/lib/seller-signup.test.ts`
- Test: `artifacts/api-server/src/routes/public-registration.integration.test.ts`

- [ ] **Step 1: Run focused frontend tests and typecheck**

Run the seller-signup test, the existing frontend test suite, and frontend typecheck.

- [ ] **Step 2: Run backend seller registration integration coverage**

Run the public-registration integration test and confirm missing/invalid CAPTCHA remains rejected while valid CAPTCHA creates a pending vendor.

- [ ] **Step 3: Restart and inspect**

Restart only `Start application`, inspect fresh logs, and capture the seller registration form to confirm the CAPTCHA state renders without manifest breakage.