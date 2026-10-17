---
name: Account suspension enforcement
description: Fresh account-status checks must protect every session and order-entry path.
---

Suspension must take effect on the next authenticated request, including sessions issued before suspension. Check authoritative account status without a cross-request cache; a valid signed token alone never grants access.

**Why:** A suspended member could keep using an existing session, and order-number fallback login omitted the status check used by password login. Fixing only the login screen would leave ordering open.

**How to apply:** All account login methods must enforce the same active-account policy, including order-number and social-login fallbacks. Session issuance must also reject inactive accounts. Preserve verification/revocation restrictions and fail closed if current status cannot be checked, without logging users out merely because the database is temporarily unavailable.

Existing guest ordering must not bypass suspension by omitting a cookie: check the submitted account identity's authoritative status too. For authenticated purchases, use the already-authorized request identity, not another raw JWT decode.

**Why:** Guest compatibility is intentional, but it must not become a downgrade path for suspended or revoked sessions.

**How to apply:** Keep legitimate guest orders available while refusing an inactive existing account or suspended historical customer identity. Do not broaden this into blocking Admin's separate management operations.
