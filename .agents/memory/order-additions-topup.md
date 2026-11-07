---
name: Order additions / top-ups
description: Prepared batches allow separate additions; vendor-submitted batches reject new additions.
---

# Order additions (top-ups)

An addition (top-up) to an uncommitted paid order appends items to that order without
creating a second active order or consuming a second code. Prepared parents split instead;
vendor-submitted parents no longer accept new additions.

## Batch-aware exception
Paid group-buy parents committed to an active prepared/confirmed supplier batch may
receive separate addition orders, not merged top-ups. Once the batch is submitted to
the vendor (ordered), no new additions are allowed. Legacy supplier-locked parents
also reject new additions; released batches without active allocations retain merging.

**Why:** The user specified that processing/prepared batches may accept additions, but
vendor-submitted batches may not. This supersedes the earlier policy allowing separate
additions even after vendor submission. Prepared snapshots still must not change.

**How to apply:** Decide under the same money/group/order lock discipline as supplier
preparation, append, release and ordering. Separate additions retain free delivery and
the parent address but own their payment and queue eligibility. Retry keys must survive
reloads and prevent duplicate coupon/credit spending. The original merge policy below
applies only to uncommitted parents. Check the actual supplier-submission state, not
merely the member order's Processing label. A successful submission replay must return
its existing result even if vendor submission happened later; do not cancel historical
additions or change their payment eligibility when enforcing the new cutoff.

## Combined shipping, separate money
Only group an unshipped original and its same-supplier-batch add-ons for one parcel,
without merging balances, payment evidence or supplier commitments. All included
orders must be authorised, paid, fully allocated and received, with compatible member,
group buy, destination and reshipper. Later-batch additions remain separate shipments;
they must not block a ready original. Already-shipped originals stay shipped.

**Why:** A reshipper missed a separate addition while packing the original. The user
explicitly requires additions outside the original batch to be treated separately,
with visible links in both directions, not an obligation to wait for every add-on.

**How to apply:** Determine parcel membership from exact allocation identities and
quantities, never names, timestamps or the mere existence of a parent link. Unallocated,
partial or multi-batch families need review rather than inferred grouping. Preserve
exact dispatched membership for retries and undo, and never retrospectively combine
a shipped original. Show zero additional postage explicitly without claiming coverage
or creating a new charge.

## Supplier receipts versus generic parcel inventory
Linked batch shipments must use usable receipts tied to the exact order, product,
supplier batch and reshipper. Never substitute a product-name stock match.

**Why:** Legacy parcel inventory has no supplier-batch identity. Deducting or restoring
it for an exact supplier-receipt dispatch would consume or create unrelated stock.

**How to apply:** Keep receipt-backed dispatch and undo inventory provenance consistent,
under the same allocation locks as supplier fulfilment. Revalidate receipt ownership,
payment, refund state and reviewed allocation at confirmation. Ordinary unrelated
orders retain their existing stock flow.

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

## Reference compatibility

Human-readable addition references are presentation aliases, not replacements for historical canonical order codes.

**Why:** Existing payments, supplier exports, invoices, batch records and links depend on the canonical codes. A display correction must not alter those contracts or imply that an independent payable addition was merged.

**How to apply:** Keep aliases stable when orders are cancelled, filtered or paginated and when later additions arrive. Resolve parent labels only after checking the same owner and group; an unavailable or unrelated parent must not expose another member's reference.
