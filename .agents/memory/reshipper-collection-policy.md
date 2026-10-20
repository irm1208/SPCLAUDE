---
name: Reshipper collection totals
description: Scope and ownership rules for admin-fee and member-postage summaries.
---

The Admin will owe reshippers the admin fee and onward-shipping fee, and needs to record which specific orders a payout has covered.

**Why:** The user explicitly described these amounts as money they will owe the reshippers and asked for somewhere to show that the fees for the following orders have been paid.

**How to apply:** Distinguish customer charges collected from Admin-to-reshipper settlement. A collected-fees summary alone is not proof a reshipper has been paid, and a payout must not change the member's payment or fulfilment status.

The reshipper dashboard should show collected admin fees and member delivery/postage for the selected group buy. Do not include vendor shipping in that shipping total.

**Why:** The user asked for a dashboard card so reshippers know how much was collected, and explicitly selected “Member delivery/postage only.”

**How to apply:** Count ordinary charges only from fully paid orders assigned to that reshipper, excluding unpaid balances, test-only payments, cancelled/refunded/deleted orders and direct shipping. Include actually paid separate onward-delivery receipts as well, without exposing wallets or transaction proof belonging to someone else. Keep different currencies separate rather than guessing conversions. These totals describe paid charges, not a live wallet balance.

Receipt parsing must distinguish order-payment status from onward-payment status.

**Why:** Fully paid orders use `confirmed`, but confirmed onward charges use `paid`. Treating them as the same status silently omits collected delivery money.

**How to apply:** Use the canonical onward-payment types and shared ledger-key function when aggregating receipts; deduplicate historical/current receipt IDs, and fail explicitly if a financial summary cannot be read.
