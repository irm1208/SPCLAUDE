---
name: Replit preview account cookies
description: Cookie attributes required for account sessions to survive inside the embedded Replit preview.
---

Account session cookies in a Replit preview must use `Secure`, `SameSite=None`, and `Partitioned`. Use ordinary `SameSite=Lax` behavior outside Replit unless production requirements say otherwise. Every clear-cookie path must use the same attributes as issuance. For admin-to-member session handoffs opened in a new tab, commit the cookie on a `200` HTML landing document before navigating; an immediate `302` can lose the partitioned cookie.

**Why:** In the embedded cross-site preview, `SameSite=Lax` produced a successful login response followed immediately by an unauthenticated account request because the browser withheld the session cookie. A new-tab impersonation flow also issued a server-valid cookie but the browser dropped it across an immediate redirect.

**How to apply:** Any change to account-cookie issuance, logout, forced session clearing, authentication middleware, or new-tab session handoff must keep the preview-aware options centralized and preserve a document boundary before navigation.