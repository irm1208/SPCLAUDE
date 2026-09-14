---
name: Replit preview account cookies
description: Cookie attributes required for account sessions to survive inside the embedded Replit preview.
---

Account session cookies in a Replit development preview must use `Secure`, `SameSite=None`, and `Partitioned`. Published production must use a first-party `Secure` + `SameSite=Lax` cookie even though `REPL_ID` is also present there. Every clear-cookie path must use the same attributes as issuance.

**Why:** In the embedded cross-site preview, `SameSite=Lax` produced a successful login response followed immediately by an unauthenticated account request. Conversely, classifying production as preview made a live custom-domain new-tab handoff issue a partitioned cookie that was not sent on the next request.

**How to apply:** Detect preview with both non-production environment and `REPL_ID`; never use `REPL_ID` alone. Keep issuance and clearing options centralized.