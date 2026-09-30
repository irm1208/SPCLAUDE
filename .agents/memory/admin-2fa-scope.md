---
name: Admin 2FA scope
description: Scope and fallback behavior for Peps authenticator-app 2FA.
---

Authenticator-app 2FA applies only to the Peps admin backend, including the FS3 tab and sensitive admin settings. Do not extend it to customer, organiser, reshipper, pool-leader, seller, or vendor authentication.

**Why:** The user explicitly limited 2FA to the admin backend and wants it configurable rather than mandatory for all roles. Optional 2FA must also allow an explicitly remembered login without leaving a reusable shared password in browser storage; server sessions provide logout, CSRF protection, and secret-rotation invalidation.

**How to apply:** Provide an admin security toggle. Enabled mode uses named admin sessions, login TOTP, and step-up TOTP. Disabled mode accepts the shared `ADMIN_SECRET` at sign-in but the UI then uses a revocable server session, whether or not "Remember me" is selected. Keep the legacy header path for existing integrations; do not persist or repeatedly send the secret from the Admin UI. A remembered session is seven days; unchecked Admin sessions retain short idle/absolute limits and use browser-session cookies.