---
name: Shared-order payment routing
description: Authority and fallback rules for payment destinations on shared wholesale orders.
---

Shared wholesale orders are peer-to-peer. Every newly offered or initialized payment method must resolve exclusively from the organiser’s payment fields on that share. If the organiser omits AnonPay or crypto, that method is unavailable; never fall back to site-wide, wholesale-admin, or global wallets.

**Why:** A global AnonPay default remained active when a share had no organiser AnonPay wallet, silently routing member money to the admin instead of the organiser. Duplicated crypto resolution in background verification created the same class of risk.

**How to apply:** Enforce the rule in payment-info responses, rate locking and verification, main and balance AnonPay initialization, frontend wallet fallback, and background auto-verification. Existing already-created AnonPay sessions may remain resumable so customers are not stranded mid-payment.