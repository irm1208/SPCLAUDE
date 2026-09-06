---
name: Admin step-up scope
description: The user-approved boundary for extra Authenticator prompts inside an authenticated admin session.
---

After admin login, require an extra Authenticator prompt only for admin 2FA/recovery operations and changes to wallet or payment-routing destinations, including reshipper payment destinations. Customer password resets, payment-status updates, orders, group buys, products, content, shipping, roles, and other routine operations use the authenticated admin session plus CSRF without another prompt.

**Why:** The user explicitly rejected step-up authentication on every routine admin button. Extra prompts are reserved for actions that can weaken admin security or redirect money.

**How to apply:** New admin mutations should not inherit step-up by default. Add step-up only when the action changes admin authentication/recovery or a money destination/routing configuration, and action-bind destination changes where practical.