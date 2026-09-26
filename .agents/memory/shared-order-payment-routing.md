---
name: Shared-order payment routing
description: Authority and fallback rules for payment destinations on shared wholesale orders.
---

Shared wholesale member payments are peer-to-peer. Every newly offered or initialized member payment method must resolve exclusively from the organiser’s payment fields on that share. If the organiser omits AnonPay or crypto, that method is unavailable; never fall back to site-wide, wholesale-admin, or global wallets. The separate organiser-to-platform forwarding leg uses platform receiving wallets; it is not another organiser wallet setting. ERC-20 USDT and USDC can intentionally share one receiving address.

**Why:** A global AnonPay default remained active when a share had no organiser AnonPay wallet, silently routing member money to the admin instead of the organiser. Duplicated crypto resolution in background verification created the same class of risk. The two distinct payment legs can also look like duplicate or mistaken wallet settings unless clearly labelled.

**How to apply:** Enforce member-payment routing in payment-info responses, rate locking and verification, main and balance AnonPay initialization, frontend wallet fallback, and background auto-verification. Existing already-created AnonPay sessions may remain resumable so customers are not stranded mid-payment. Label platform receiving options as distinct from the organiser's own collection wallet; verify a claimed wrong address against the expected destination before changing it.