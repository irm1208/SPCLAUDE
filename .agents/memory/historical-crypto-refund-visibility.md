---
name: Paid group-buy refund eligibility
description: Defines refund eligibility and amount authority for manual, historical, and Admin-edited paid group-buy orders.
---

Any group-buy order with server-owned `confirmed` payment status and a confirmation
timestamp may request and complete a refund without original incoming transaction
evidence. This includes manual and Admin-edited paid orders. `test_confirmed`
remains ineligible.

**Why:** Manual orders and post-close quantity increases may be genuinely paid
without payment fields that can still be matched to one original on-chain amount.
Using incoming proof as the gate hid the refund system or rejected valid requests.

**How to apply:** Derive eligibility from locked order/payment/refund state and
snapshot the current persisted `grandTotal` when creating the request. Customers
never supply the amount. Keep processor authorization, outgoing crypto transfer
verification, terminal-state checks, idempotency, and audit/outbox handling intact.