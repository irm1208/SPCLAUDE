---
name: Testing authenticated customer endpoints in dev
description: How to e2e-test account-session-gated API routes without a login flow.
---

There is no dev-login route, so authenticated pages can't be screenshotted. But customer-session API routes CAN be curl-tested in dev:

- Dev server falls back to a hardcoded JWT secret when `ACCOUNT_JWT_SECRET` is unset (see `getJwtSecret()` in the account-auth middleware — the fallback string is in the source).
- Sign a token with `jsonwebtoken` from `artifacts/api-server` node_modules: payload `{ telegramUsername, jti }`, then send as `Cookie: account_session=<token>`.
- Pick real usernames/GB ids from the dev DB via the executeSql sandbox callback (`pg` is NOT installable/requirable directly in api-server node -e).

**Why:** enables verifying 401/403/200 auth matrices and response shapes end-to-end instead of reasoning-only verification.

**How to apply:** dev environment only; use short expiry, delete token files after; never applicable in production (fallback throws there).
