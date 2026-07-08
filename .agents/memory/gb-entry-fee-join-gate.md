---
name: Group Buy paid entry fee join gate
description: How the optional GB entry-fee feature gates membership at join time — read before touching group-buy join logic or entry fee payments.
---

Group buys can require a fixed, admin/organiser-configured entry fee before a customer's join request grants actual membership (`account_group_buys` row).

- **Gate location**: the join endpoint (customer `account.ts` join-group-buy handler) checks `gb.entryFeeEnabled` BEFORE inserting the membership row. If enabled and the fee isn't `confirmed`, it returns HTTP 402 with `code: "ENTRY_FEE_REQUIRED"` and a `entryFee` payload (via `shapeEntryFeePayment`) instead of joining. Membership is inserted only after `grantEntryFeeMembership(payment)` runs (either inline on a confirmed re-attempt, or by the crypto auto-verify scheduler / an admin|organiser manual confirm).
- **Payment record**: lives in `gb_entry_fee_payments` (own table, not on `orders`), one row per (groupBuyId, accountId). Status lifecycle: pending → submitted (customer sent a tx hash) → confirmed/rejected. Crypto-only (tx hash + scheduler auto-verify); no screenshot upload path.
- **Confirm/reject authority**: both admin (`x-admin-secret`, any GB) and the owning organiser (`credentials: "include"` cookie, own GB only — scoped via `gbOwner(req, id)`) can confirm/reject via parallel PATCH endpoints; both funnel through the same `confirmEntryFeePayment`/`rejectEntryFeePayment` helpers in `lib/gb-entry-fee.ts` so side effects (membership grant, notifications) never diverge between the two actor types.

**Why:** without the gate living solely in the join handler (not duplicated in the entry-fee submit/verify routes), it would be easy to grant membership from a second code path and skip the fee.

**How to apply:** any new way to join a GB (bulk import, admin force-add, invite links) must route through the same gate/insert logic, not bypass straight to `accountGroupBuysTable.insert`.
