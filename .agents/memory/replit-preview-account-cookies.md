---
name: Replit preview account cookies
description: Cookie attributes required for account sessions to survive inside the embedded Replit preview.
---

Account session cookies in a Replit preview must use `Secure`, `SameSite=None`, and `Partitioned`. Use ordinary `SameSite=Lax` behavior outside Replit unless production requirements say otherwise. Every clear-cookie path must use the same attributes as issuance.

**Why:** In the embedded cross-site preview, `SameSite=Lax` produced a successful login response followed immediately by an unauthenticated account request because the browser withheld the session cookie.

**How to apply:** Any change to account-cookie issuance, logout, forced session clearing, or authentication middleware must keep the preview-aware options centralized and shared.