# Admin 2FA and Registration Abuse Protection Design

**Date:** 2026-09-06  
**Status:** Approved design awaiting written-spec review

## 1. Purpose

Strengthen the Peps production administration surface by:

1. Replacing routine browser use of the shared `ADMIN_SECRET` with named, revocable administrator sessions.
2. Requiring authenticator-app TOTP at every administrator login.
3. Requiring a fresh step-up TOTP challenge for high-impact settings and FS3 mutations.
4. Blocking automated production registrations and audit/test traffic without weakening legitimate customer access.
5. Making authentication logs attributable, non-duplicative, and useful for incident review.

This change covers the Peps admin backend and the FS3 tab inside that backend. It does not cover the separate vial-shop seller dashboard.

## 2. Existing Risks

### 2.1 Admin authentication

The current browser stores or retains a shared admin secret and sends it as `x-admin-secret`. The server compares that value with `ADMIN_SECRET`. There are no named administrator identities, revocable sessions, per-admin audit attribution, authenticator challenges, or recovery codes.

Some routes use the shared `requireAdmin` middleware while others implement inline secret comparisons. A secure migration must remove these inconsistent bypass paths.

### 2.2 FS3 protection

The FS3 tab asks for `FS3_PASSWORD`, but successful verification only unlocks React state. FS3 API endpoints remain protected by the same general admin secret. The static FS3 password is therefore not an enforceable server-side second factor.

### 2.3 Registration abuse and audit traffic

Production received machine-generated accounts and deliberate invalid login, lookup, transaction, seller, and admin-auth requests. Logged IP addresses appear to be shared edge-proxy addresses rather than reliable client identities. Existing controls do not prevent automated audit suites from writing synthetic data to production.

## 3. Chosen Approach

Implement named administrator accounts with password authentication, authenticator-app TOTP, server-side sessions, recovery codes, and server-enforced step-up authorization.

Keep `ADMIN_SECRET` only as a temporary bootstrap and controlled emergency mechanism. Ordinary admin UI/API traffic must not send it after migration.

Use layered signup-abuse controls: trusted client attribution, server-side rate limits, Turnstile, honeypot/timing checks, production test guards, and alerting.

## 4. Administrator Identity and Storage

Add dedicated administrator storage separate from customer accounts.

### 4.1 Administrator identity

Each administrator has:

- Stable internal ID
- Unique username
- Password hash using the project’s approved memory-hard password algorithm
- Encrypted TOTP secret
- TOTP enabled/enrolment state
- Active/disabled state
- Created, updated, and last-login timestamps
- Password-change and 2FA-change timestamps

No plaintext password, TOTP secret, recovery code, admin session token, or bootstrap secret may be stored in logs or returned after initial display.

### 4.2 Recovery codes

- Generate a fixed set of one-time recovery codes after TOTP enrolment.
- Display them once.
- Persist only cryptographic hashes.
- Consume each code atomically.
- Regeneration invalidates every previous recovery code and requires a fresh TOTP challenge.

### 4.3 Encryption

TOTP secrets must be encrypted at rest with a dedicated application encryption key held in Replit Secrets. The encryption key is distinct from session-signing, account-JWT, admin-bootstrap, and webhook secrets.

## 5. Admin Authentication Flow

### 5.1 Bootstrap

When no administrator identity exists:

1. The admin setup page accepts the existing bootstrap `ADMIN_SECRET`.
2. The server verifies it using timing-safe comparison.
3. The user creates the first named administrator password.
4. The server generates a TOTP secret and enrolment URI.
5. The user confirms enrolment with a valid authenticator code.
6. Recovery codes are displayed once.
7. A normal authenticated admin session is issued.

Bootstrap must become unavailable after the first administrator is enrolled unless explicitly re-enabled through controlled environment configuration.

### 5.2 Login

1. Submit administrator username and password.
2. If primary authentication succeeds, create a short-lived pending challenge, not a full admin session.
3. Submit a TOTP code or unused recovery code.
4. On success, rotate the challenge and issue an opaque admin session cookie.

Responses must not reveal whether the username, password, or TOTP was the incorrect factor.

### 5.3 Session

The admin session:

- Uses a random opaque token.
- Stores only a token hash in PostgreSQL.
- Is delivered in an `HttpOnly`, `Secure` in production, `SameSite=Strict` cookie.
- Has bounded idle and absolute expiry.
- Is rotated after login, password change, 2FA change, and privilege-sensitive recovery.
- Can be revoked server-side.
- Is invalidated on logout.
- Records administrator ID, creation, last use, expiry, revocation, and recent step-up time.

State-changing routes require CSRF protection appropriate to the cookie-based session. Origin/Referer validation and an explicit CSRF token must be used; SameSite alone is not sufficient.

### 5.4 TOTP rules

- Six-digit authenticator-app TOTP.
- Allow only a narrow clock window.
- Persist the last accepted TOTP time-step per administrator and reject replay of a code already used in that step.
- Rate-limit password, pending challenge, TOTP, recovery, bootstrap, and step-up attempts.
- Do not expose factor-specific failure details.

## 6. Central Admin Authorization

Replace every inline `ADMIN_SECRET` check and ordinary use of `x-admin-secret` with central middleware.

### 6.1 `requireAdminSession`

This middleware:

- Validates the opaque session cookie.
- Loads the active administrator identity.
- Enforces session expiry and revocation.
- Enforces CSRF for mutations.
- Sets the authenticated administrator identity on request locals.
- Updates bounded session activity without write amplification.

All admin routes, including read-only routes and FS3 reads, require this middleware.

### 6.2 `requireAdminStepUp`

This middleware:

- Requires a successful TOTP challenge within the previous 10 minutes.
- Checks the assertion belongs to the current administrator session.
- Supports a stricter single-use mode for especially sensitive actions.
- Returns a structured `step_up_required` response without performing any mutation.

The server is authoritative. UI prompts are usability features, not security controls.

### 6.3 No bypass routes

The implementation must enumerate every admin HTTP mutation and prove it passes through central session middleware. Duplicated FS3 routes must be consolidated or identically protected so router ordering cannot expose a weaker implementation.

## 7. Step-Up Policy

### 7.1 Ten-minute reusable step-up

Require a recent TOTP challenge for:

- FS3 cost create/update/delete
- FS3 batch submission and order locking
- FS3 address reminder sends
- Payment-status overrides
- Fee and pricing configuration
- Organiser, reshipper, pool-leader, seller/vendor, or wholesale access changes
- Vendor, product, courier, shipping, coupon, and group-buy destructive mutations
- Webhook and Telegram configuration
- AI provider/model configuration
- Maintenance and production-impacting system settings

### 7.2 Single-use fresh challenge

Require a new challenge every time for:

- Receiving-wallet or payment-network destination changes
- Administrator account creation, disabling, password reset, or role/security changes
- TOTP replacement or removal
- Recovery-code regeneration
- Session revocation affecting another administrator
- Changes to security-sensitive authentication configuration

The action must be bound to the challenge so a code approved for one wallet or administrator change cannot authorize a different mutation.

### 7.3 Before/after audit

Every sensitive mutation records:

- Authenticated administrator ID and username
- Request ID
- Action category
- Target type and target ID
- Redacted before and after values
- Step-up time and authorization mode
- Trusted client fingerprint
- Result

Secrets, passwords, TOTP values, session tokens, recovery codes, full wallet secrets, and sensitive personal data must never be logged.

## 8. FS3 Design

The FS3 tab becomes part of normal admin-session authorization.

- Opening and reading FS3 requires a fully authenticated 2FA admin session.
- FS3 cost writes/deletes require recent step-up.
- FS3 batch submission/order locking requires recent step-up and a confirmation summary.
- Address reminder sends require recent step-up.
- Read-only P&L, summaries, products, orders, members, parcels, and submissions do not require repeated step-up.

After migration, `FS3_PASSWORD` is removed from the normal UI flow and must not be treated as authorization. It may be deleted after rollout confirmation.

## 9. Registration Abuse Protection

### 9.1 Trusted client attribution

Configure Express proxy trust for the known deployment topology rather than trusting arbitrary forwarding headers. Derive a normalized client fingerprint from the trusted client address plus coarse, privacy-preserving request characteristics.

Do not treat shared edge addresses as reliable individual identities.

### 9.2 Layered signup controls

Public account signup requires:

- Valid Cloudflare Turnstile verification performed server-side.
- A honeypot field that legitimate users never fill.
- A minimum reasonable form-completion time using a signed server-issued form token.
- Per-client, per-username, per-email, and global velocity limits.
- Existing invite-only mode when enabled.
- Generic errors that do not aid account enumeration.

Login, password reset, order lookup, seller signup/login, admin login, TOTP, and recovery endpoints receive endpoint-appropriate server-side limits.

### 9.3 Audit/test production guard

Automated destructive or data-creating audit suites must receive an explicit target environment and refuse to run when:

- The target is the production deployment domain, or
- The connected database identifies itself as production.

Production may additionally reject known synthetic audit username prefixes, but prefix matching is defense-in-depth only and must not be the primary control.

### 9.4 Alerting

Create security alerts for:

- Signup velocity above threshold
- Repeated admin password/TOTP/recovery failures
- Repeated Turnstile failures
- Many related requests distributed across proxy addresses
- Recovery-code use
- Administrator security changes
- Wallet and payment destination changes

One HTTP request must create one primary authentication failure record. Related details share the same request ID instead of appearing as independent attempts.

## 10. Frontend Experience

### 10.1 Admin login

The existing admin-secret prompt becomes:

1. Username/password form
2. Authenticator-code form
3. Recovery-code alternative
4. Initial enrolment flow when bootstrapping

The frontend never stores admin passwords, TOTP codes, session tokens, or the bootstrap secret in local or session storage.

### 10.2 Step-up prompt

When an API returns `step_up_required`:

- Preserve the pending form data in memory.
- Show a clear authenticator-code dialog naming the requested action.
- Submit the challenge.
- Retry the mutation once after successful authorization.
- Never retry automatically after a second authorization failure.

Single-use actions show a final confirmation containing the exact target and redacted before/after values.

### 10.3 Signup

The customer signup form integrates Turnstile, a hidden honeypot, and a server-issued form token without exposing why a suspected automated submission was rejected.

## 11. Error Handling

- Authentication errors use generic user-facing messages.
- Rate-limited responses include a bounded retry time where safe.
- Expired sessions return `admin_session_expired`.
- Valid sessions lacking recent TOTP return `step_up_required`.
- Invalid or replayed challenges do not execute the protected mutation.
- Turnstile provider unavailability fails closed for new signup in production and produces an operational alert.
- Database failure during session, recovery-code, or step-up updates fails closed.
- Sensitive mutations remain atomic with their existing business safeguards; 2FA does not bypass status gates, transactions, or row locks.

## 12. Migration and Rollout

1. Add administrator, session, recovery-code, challenge, and rate-limit storage.
2. Add central session, CSRF, TOTP, and step-up services behind a rollout flag.
3. Enrol the first named administrator through bootstrap.
4. Convert the admin frontend to session authentication.
5. Convert all admin routes and remove inline shared-secret checks.
6. Apply step-up policy to high-impact routes.
7. Convert the FS3 tab and remove its static-password UI gate.
8. Enable signup Turnstile and server-side abuse controls.
9. Verify security audit events and alerts.
10. Disable ordinary `x-admin-secret` access and bootstrap.
11. Remove `FS3_PASSWORD` after successful production validation.

Rollback may temporarily restore the previous login path behind an explicit emergency flag, but must not silently allow both old and new authorization on the same route.

## 13. Testing

### 13.1 Authentication tests

- Bootstrap only works with no enrolled admin and a valid bootstrap secret.
- Password success does not create a full session before TOTP.
- Valid TOTP creates a session.
- Incorrect, expired, and replayed TOTP codes fail.
- Recovery code works once and is consumed atomically.
- Logout, expiry, password change, 2FA change, and disablement revoke sessions.
- Cookies and CSRF protections have correct production behavior.

### 13.2 Authorization tests

- Every admin route rejects anonymous, pending-2FA, expired, and revoked sessions.
- Every sensitive route rejects a normal session without step-up.
- Reusable step-up expires after 10 minutes.
- Single-use authorization cannot be replayed or used for another action.
- Duplicated/alternate route mounts cannot bypass protection.
- Existing business status and money-integrity gates still apply after 2FA.

### 13.3 FS3 tests

- Authenticated admin can read FS3.
- FS3 cost changes, submission, and reminder actions require step-up.
- FS3 submission cannot partially update orders if authorization or business validation fails.
- Client-side unlocked state alone grants no API access.

### 13.4 Abuse-control tests

- Turnstile is required and verified server-side in production.
- Honeypot and implausibly fast submission are rejected.
- Limits work across username, email, client fingerprint, and global velocity.
- Trusted proxy extraction cannot be overridden by arbitrary forwarding headers.
- Production audit guards refuse production targets.
- One failed request produces one correlated primary audit event.

### 13.5 Verification

- API tests and frontend tests pass.
- Typecheck and production build pass.
- Security scan covers credentials, sessions, CSRF, TOTP replay, route bypasses, and dependency findings.
- Production rollout is validated with a non-privileged test administrator before the old access path is disabled.

## 14. Acceptance Criteria

The work is complete when:

- Routine admin access uses named password + authenticator login and a revocable HTTP-only session.
- No normal admin request sends or stores `ADMIN_SECRET`.
- Every admin API route uses central authorization.
- High-impact settings and FS3 mutations enforce server-side step-up TOTP.
- Wallet and administrator-security changes require action-bound single-use authorization.
- FS3’s static password is no longer treated as authorization.
- Automated signup/audit behavior is blocked through layered production controls.
- Real client attribution follows a safe trusted-proxy configuration.
- Audit records identify the administrator and correlate one request once.
- Recovery, rollout, rollback, and production monitoring are documented and tested.
