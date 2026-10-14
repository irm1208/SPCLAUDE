---
name: Shared organiser payment confirmation
description: Integrity rules for forwarding a shared wholesale collection from the organiser to the platform.
---

An organiser-to-platform payment exists only when the shared order has a valid organiser-owned collection wallet. A full on-chain USDT/USDC payment with no member credits may confirm automatically. Partial or unverified payments, any payment whose total was reduced by member credits, and unsupported currencies must remain pending until an administrator explicitly confirms them. Confirmation must lock the parent share and confirm the parent and creator order atomically. Never infer that the creator order is paid from wallet configuration alone; views must use its persisted payment status.

Before showing forwarding instructions, accepting a transaction, or confirming a pending platform payment, require a final positive payable amount and fully confirmed payments from every active non-organiser member. A test-confirmed payment covers only the verification amount. Unknown vendor shipping means the payable is unknown, not zero. Once forwarding starts, ordinary members must not be manually reverted to unpaid; after full confirmation, replaying a test-payment request must not downgrade any member order. The organiser cannot manually mark their own forwarding order paid.

**Why:** The user wants full blockchain payments automated, but partial and credit-adjusted payments require human review. Automatic confirmation must recheck current credits and amount under lock, and transaction identity must be normalized and unique to prevent replay. Synthesizing creator payment status from wallet setup also reports payment before approval. A missing shipping quote previously displayed a false $0 total, and a test-only payment or later status reversal could authorize or invalidate forwarding prematurely.

**How to apply:** Submission stores the transaction as pending and starts immediate plus scheduled checks. Auto-confirm only after strict full-amount verification with zero credits and a locked amount/credit recheck. Keep all other cases pending for the Admin action; preserve ordinary member orders and keep repeats idempotent. Serialize member payment changes with the parent share and guard all test-payment writes against a concurrent full confirmation.

The Admin Shared Orders “payment received” figure means money received by the platform, not member collections held by the organiser. Show it separately from the shared-order total. A forwarded receipt must reflect the recorded amount, not the current calculated payable; historical missing receipt amounts are unknown.

**Why:** The user explicitly selected platform receipts because they differ from the total shared order.

**How to apply:** Keep organiser collections and platform receipts distinct in summaries. Never substitute tips, organiser fees, member credits, pending transactions, or an unrecorded historical amount for a platform receipt.