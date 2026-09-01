---
name: Order additions / top-ups
description: Paid-order additions merge into the parent and charge only the incremental balance.
---

# Order additions (top-ups)

An addition (top-up) appends items to an existing paid order. It must not create a
second active order or consume a second order code.

## The invariant
The server must lock and revalidate the paid parent, append/combine canonical catalog
items, increase its gross totals, and add only the incremental unpaid amount to
`amountDue`. The original order code and confirmed primary-payment state stay unchanged.
Shipping, address, routing, and original payment metadata stay unchanged.

**Why:** Separate child orders made customers see a second order/payment flow and
allowed stale browser state to choose the wrong group buy. Merging preserves the
single-order model while still collecting the new balance.

## How to apply
Require an authenticated session whose normalized username matches the parent owner.
Never trust client group-buy IDs, product names, or prices: derive the group buy from
the parent and resolve active products and prices from the server catalog. Perform the
line-item and total update in one transaction with a row lock.

Balance-confirmation writes must compare the amount/session they verified before
setting `amountDue` to zero. A stale crypto or AnonPay confirmation must return a
conflict if an addition changed the balance during external verification.

**How to apply:** Any new add-on entry point must use this same merge path and navigate
to the parent order's balance-payment UI. Historical child additions may be soft-deleted
after a guarded merge, but never hard-deleted.
