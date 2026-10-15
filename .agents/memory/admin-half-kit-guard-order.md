---
name: Admin and half-kit guard ordering
description: Why session authentication must precede the shared half-kit mutation guard.
---

Run the scoped admin session/CSRF boundary before half-kit protection, and keep half-kit protection before protected write handlers. Do not fix rejected admin writes by skipping half-kit locks or falling back to a shared secret when 2FA is enabled.

**Why:** The half-kit guard authenticates admin mutation plans with requireAdmin. When mounted first, it cannot see the authenticated session flags yet and rejects valid session-only admins with 401. Read-only previews still work because they do not enter that guard, making a functioning fulfilment board appear to have broken drag-and-drop or routing controls.

**How to apply:** When reads succeed but admin order writes return 401, inspect the complete middleware order before changing UI handlers or order data. Test with real authentication and half-kit middleware together, covering session plus CSRF, expired/missing sessions, and disabled-2FA compatibility. Preserve advisory locks and half-kit financial checks.
