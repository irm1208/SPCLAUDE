---
name: GB vendor-shipping payment integrity
description: Payment rules for organiser-applied vendor shipping changes.
---

Vendor-shipping changes on confirmed group-buy orders must preserve the already-paid amount. Any increase is added to `amountDue` and marked as an unpaid balance. Do not rewrite the primary payment lock.

**Why:** Treating a newly added shipping charge as part of an already-confirmed payment makes an unpaid increment appear settled. Reducing a confirmed total can also imply an automatic refund that never occurred.

**How to apply:** Route automatic splits and manual per-member overrides through the same reconciliation rule. Reject decreases on confirmed orders and reject edits while a balance payment is pending verification. Unpaid primary orders may update normally and must clear stale primary payment locks after total changes.