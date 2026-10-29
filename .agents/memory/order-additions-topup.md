---
name: Order additions / top-ups
description: Batched paid-order additions split; uncommitted additions merge with incremental balances.
---

# Order additions (top-ups)

An addition (top-up) to an uncommitted paid order appends items to that order without
creating a second active order or consuming a second code. Batched parents split instead.

## Batch-aware exception
Paid group-buy parents committed to an active prepared/confirmed or ordered supplier
batch receive separate addition orders, not merged top-ups. Legacy supplier-locked
parents also split; released batches without active allocations do not.

**Why:** The user explicitly superseded the single-order policy for batched parents:
the original financial records and supplier snapshot must not change.

**How to apply:** Decide under the same money/group/order lock discipline as supplier
preparation, append, release and ordering. Separate additions retain free delivery and
the parent address but own their payment and queue eligibility. Retry keys must survive
reloads and prevent duplicate coupon/credit spending. The original merge policy below
applies only to uncommitted parents.

## The unbatched invariant
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

**How to apply:** New add-on entry points use the server's split-versus-merge outcome:
merged additions navigate to the parent balance; separate ones open their own payment
details. Historical child additions may be soft-deleted
after a guarded merge, but never hard-deleted.
