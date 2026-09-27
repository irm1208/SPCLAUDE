---
name: Admin startup outages vs authentication
description: Keep temporary API unavailability separate from expired admin credentials.
---

When the production API returns 503 during startup, admin security-mode discovery and session restoration must wait and retry; visibility checks must not log out an already-authenticated admin for a transient error. Only a definitive session rejection should clear credentials.

**Why:** A production instance took tens of seconds to finish bootstrap while serving 503s. A one-shot security-mode request stranded the page on an error screen, while an unrelated visibility recheck treated any non-OK result as invalid credentials and logged the admin out.

**How to apply:** For new admin authentication checks, distinguish unavailable (503/proxy outage) from expired (the explicit admin-session-expired response) and wrong shared-secret (401/403). The client can retry availability but must never bypass server authorization or assume a mode on failure.