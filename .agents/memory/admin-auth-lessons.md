---
name: Admin authentication lessons
description: Links to admin-only 2FA boundaries, sessions, standalone tabs, step-up and startup resilience.
---

- [Admin 2FA scope](admin-2fa-scope.md) — admin-only authentication, disabled-mode shared-secret login and revocable sessions.
- [Fetch interception](admin-fetch-interceptor-recursion.md) — preserve native fetch to avoid recursive admin requests.
- [Standalone admin pages](admin-2fa-standalone-pages.md) — separate tabs need their own restored session and mutation authentication.
- [Step-up scope](admin-step-up-scope.md) — extra TOTP belongs to security and money destinations, not routine actions.
- [Startup resilience](admin-startup-auth-resilience.md) — transient bootstrap failures must not be treated as rejected sessions.
