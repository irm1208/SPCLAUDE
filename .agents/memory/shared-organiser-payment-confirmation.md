---
name: Shared organiser payment confirmation
description: Integrity rules for forwarding a shared wholesale collection from the organiser to the platform.
---

An organiser-to-platform payment exists only when the shared order has a valid organiser-owned collection wallet. Submitted transactions must remain pending until an administrator explicitly confirms them; do not automatically verify or confirm them. Manual confirmation must lock the parent share and confirm the parent and creator order atomically. Never infer that the creator order is paid from wallet configuration alone; views must use its persisted payment status.

**Why:** The user requires human review before the organiser's forwarded platform payment changes to confirmed. Automatic on-chain verification previously bypassed the intended Admin confirmation control. Synthesizing creator payment status from wallet setup also reports payment before approval.

**How to apply:** Submission stores the transaction as pending and notifies Admin, but starts no immediate or scheduled confirmation. Only the Admin action (plus explicit historical backfill) may use the shared transactional confirmation operation; preserve member orders and keep repeats idempotent.