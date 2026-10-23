---
name: Member regional batch visibility
description: Country privacy and eligibility rules for the group-buy card's View batches action.
---

Members may see their own destination region's filling progress, but batch references and statuses only for batches containing their own active orders. Sharing a region is not enough to see another member's batch. This requires the existing explicit member-visibility opt-in.

**Why:** The user specifically requested “x amount of 100” from the group-buy card's three dots, with members seeing only their country's/region's batches, not everyone's.

The user subsequently clarified that members should only know the batch codes they are included in, not other batches in their region.

Once a member has an assigned batch, hide filling/next-batch progress unless they have another active, non-direct order not yet allocated. For that additional order show its region's progress alongside their assigned batch(es), even if it is not yet paid; never imply unpaid orders are included.

**Why:** The user said members already in a batch do not need to see the next one unless they make another order, in which case show both.

**How to apply:** Determine unallocated owned orders server-side, per destination region. Cancelled/refunded/deleted orders and direct shipping must not reopen unrelated queue progress. Members without assigned batches retain their regional progress.

**How to apply:** Enforce this on the server, never by hiding other regions in the browser. Use active order destinations; for members without a usable order destination, use their joined country leg then profile country. Unknown destinations must not grant global access. Multiple legitimate order destinations may yield multiple corresponding regions. Match historical batches to snapshot country coverage rather than reusing a mutable region ID.

The filling count is the fully paid, unallocated, non-direct supplier queue, not the general group-buy MOQ total (which includes unpaid orders). Viewing progress must not prepare batches, mutate readiness or trigger staff alerts.

**Why:** Paid supplier-batch eligibility and general MOQ serve different purposes; member viewing must remain read-only and consistent with staff batch preparation.

Make personal inclusion explicit on the filling progress card rather than calling it “Next batch.” Only say an order is in that batch if it falls within the proposed whole-order batch, not merely somewhere in the region's queue. Distinguish later queued orders and orders already allocated to a prepared batch.

**Why:** The user reported that members found “Next batch” confusing and requested a clear statement that their order is within the displayed batch. A regional total alone does not establish personal inclusion.

**How to apply:** Determine inclusion server-side using the same proposed order selection as staff preparation. Do not imply that an unpaid/direct order is included or that a filling batch has already been ordered from the supplier.

For members whose active orders are all direct shipping, “View batches” should just show “Direct shipping,” without regional filling progress or supplier-batch history.

**Why:** The user requested this explicitly after a direct-order member saw an unrelated regional batch and assumed their order was excluded.

**How to apply:** Use the canonical routing decision, where an assigned reshipper overrides stale direct flags. If a member also has reshipper orders, preserve the corresponding regional information for those orders.

Keep batch/vendor-submission status separate from the member's individual order status. A prepared supplier batch is not yet a submitted vendor purchase, and vendor submission is not shipment or receipt.

**Why:** The user requested both their actual batch and their order status, plus an explicit Admin confirmation that the purchase has been submitted to the vendor.

**How to apply:** Reuse the existing supplier-placement transaction and lifecycle. Show only the signed-in member's own current order codes/statuses inside an assigned batch, never all orders in that batch.
