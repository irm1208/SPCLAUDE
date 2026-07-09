---
name: GB entry-fee confirm must be transactional
description: confirmEntryFeePayment status update + membership grant must be one DB transaction, not two sequential statements
---

Confirming a group-buy entry-fee payment involves two writes: mark the payment row
"confirmed", then insert the `account_group_buys` membership row. These must run inside a
single `db.transaction`, and re-confirming an already-"confirmed" payment must still
re-attempt the (conflict-safe) membership insert instead of short-circuiting.

**Why:** the original implementation did the status UPDATE first, then a separate
`grantEntryFeeMembership` insert. If the membership insert threw (e.g. FK violation, race,
transient error), the payment was left permanently stuck as `status: "confirmed"` with no
membership row — and the WHERE clause guarded on `status != 'confirmed'`, so simply
re-clicking "confirm" in the admin panel became a silent no-op forever. Money/status showed
confirmed, but the customer never actually got into the group buy, with no way to fix it
short of manual DB surgery. Verified live via psql + curl against a real GB in this repo.

**How to apply:** any "mark X done, then grant Y as a side effect of X" pattern (payment
confirm → membership grant, order confirm → credit grant, etc.) needs either a single
transaction wrapping both writes, or an idempotent recovery path that re-attempts the side
effect even when the primary status is already in its terminal state.
