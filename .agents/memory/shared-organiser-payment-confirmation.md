---
name: Shared organiser payment confirmation
description: Integrity rules for forwarding a shared wholesale collection from the organiser to the platform.
---

An organiser-to-platform payment exists only when the shared order has a valid organiser-owned collection wallet. A full on-chain USDT/USDC payment with no member credits may confirm automatically. Partial or unverified payments, any payment whose total was reduced by member credits, and unsupported currencies must remain pending until an administrator explicitly confirms them. Confirmation must lock the parent share and confirm the parent and creator order atomically. Never infer that the creator order is paid from wallet configuration alone; views must use its persisted payment status.

**Why:** The user wants full blockchain payments automated, but partial and credit-adjusted payments require human review. Automatic confirmation must recheck current credits and amount under lock, and transaction identity must be normalized and unique to prevent replay. Synthesizing creator payment status from wallet setup also reports payment before approval.

**How to apply:** Submission stores the transaction as pending and starts immediate plus scheduled checks. Auto-confirm only after strict full-amount verification with zero credits and a locked amount/credit recheck. Keep all other cases pending for the Admin action; preserve ordinary member orders and keep repeats idempotent.