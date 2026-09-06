---
name: Admin 2FA scope
description: Scope and fallback behavior for Peps authenticator-app 2FA.
---

Authenticator-app 2FA applies only to the Peps admin backend, including the FS3 tab and sensitive admin settings. Do not extend it to customer, organiser, reshipper, pool-leader, seller, or vendor authentication.

**Why:** The user explicitly limited 2FA to the admin backend and wants it configurable rather than mandatory for all roles.

**How to apply:** Provide an admin security toggle. Enabled mode uses named admin sessions, login TOTP, and step-up TOTP. Disabled mode reverts to the existing shared `ADMIN_SECRET` flow.