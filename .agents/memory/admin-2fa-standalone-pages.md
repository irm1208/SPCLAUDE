---
name: Admin 2FA authentication for standalone pages
description: How separate admin helper tabs must authenticate mutations when optional admin 2FA is enabled.
---

Standalone same-origin admin pages opened in a separate tab do not inherit the main Admin page's in-memory authentication controller or installed fetch interceptor. Before their first mutation, they must detect the active admin mode, restore the existing admin session when 2FA is enabled, and make mutations through `AdminAuthController` so cookies and the CSRF header are attached. When 2FA is disabled, the legacy shared-secret path remains available.

**Why:** the Janoshik receiver continued sending only `x-admin-secret`; after 2FA was enabled, all imports passed the session boundary without a CSRF header and failed. Newly generated 2FA bookmarklets also carry an empty legacy secret, so connection handshakes must not require that secret to be non-empty.

**How to apply:** use the shared standalone-auth initializer and session-aware request path for popup/helper/receiver pages. Do not exempt their routes from CSRF, treat the old secret as a CSRF substitute, or assume the main tab's global fetch interceptor exists in another browsing context.