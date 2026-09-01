---
name: AnonPay pages cannot be embedded
description: How AnonPay/Trocador payment sessions must be presented and restored.
---

Open AnonPay payment sessions as top-level Trocador pages, never in an iframe. Restore a persisted balance session only while its payment status is genuinely pending; unpaid or settled orders may retain historical session IDs.

**Why:** Trocador returns `X-Frame-Options: DENY`, so browsers block its page in an iframe and show a broken-document placeholder. Historical or manually reconciled orders can also retain stale AnonPay IDs.

**How to apply:** Render a styled external-payment launch card, keep confirmation and polling in the app, omit the `embed=1` presentation, and status-gate any session hydration.