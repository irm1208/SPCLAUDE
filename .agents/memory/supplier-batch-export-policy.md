---
name: Supplier batch policies
description: Full FS3 supplier TXT requirements and the boundary for adding orders to existing batches.
---

Batch packing slips must show only the quantities allocated to the selected batch,
not the customer's entire order, and remain printable without a reshipper.

**Why:** The user approved batch-filtered packing slips for HGH 36IU, including
split allocations and unassigned reshippers.

**How to apply:** Retain the batch reference on both print formats. Printing is
paperwork only; never mark dispatch, move kits or notify members as a side effect.

Supplier batch TXT downloads must retain the full FS3 format, including supplier costs and delivery contact details. Do not silently substitute a quantities-only file when setup is missing.

**Why:** The user explicitly chose to keep the full format and show exactly what needs setting up, rather than allow incomplete downloads.

**How to apply:** Report missing supplier costs and invalid/missing recipient delivery details together. Never infer supplier prices from member retail prices or change reshipper assignments to make an export pass.

Existing batches may receive more eligible paid orders only while prepared, within the same region. Additions may be below the usual kit target; ordered and released batches must remain protected.

**Why:** The user explicitly chose same-region prepared batches only, including additions below the target, to avoid changing purchases already placed with the supplier.

**How to apply:** Show the combined totals before confirmation, preserve the batch reference, and require reviewing changed queue or destination snapshots again.

When an existing allocated order changes after preparation, the user wants a reviewed update of the prepared batch that keeps its reference, rather than releasing and recreating it.

**Why:** The user explicitly confirmed “Yes, keep the batch reference” when approving the proposed review-and-update option.

**How to apply:** Show old/new changes and require explicit approval; preserve batch identity and allocations. Keep eligibility, payment and concurrency safeguards, and never refresh a batch already submitted to the supplier.

A recorded “submitted to vendor” time does not prove which quantities were
actually purchased. Reconcile disputed allocations against the vendor purchase
and received goods, not that timestamp alone.

**Why:** The user reported that the actual vendor purchase excluded whole orders
that had been appended before staff recorded the batch as submitted.

**How to apply:** An explicit Admin correction may move complete, paid, unshipped
orders to a new or user-chosen existing same-region prepared batch. Keep a visible correction marker and
the original snapshot in the audit history; correct unchecked package manifests
atomically. Never change customer payments or silently rewrite inspected receipts.

For moving **additions**, the user chose **only the extra quantities**: retain
the base quantity in its current batch, rather than relocating the complete
customer order.

**Why:** The user explicitly selected “Only the extra quantities” when asked
whether additions should move as whole orders or quantity increases, and
repeated that they mean kits added after the batch was processed. Do not answer
that question using increases since the customer's first order: the relevant
baseline is the batch's own original allocation.

**How to apply:** Highlight recorded batch additions and preview exact per-product
amounts staying/moving. Treat a partial move as a fulfilment allocation of the
same customer order, not a new financial order or another payment. Distinguish
whole rows appended after preparation from reviewed increases to existing rows.

Use batch preparation as the baseline for late additions. Customer edits before
preparation are already included, not quantities to flag or move. Distinguish
whole orders appended after preparation from subsequent increases to existing
allocated orders; show the append date and current allocation for the former.

**Why:** The user repeatedly corrected the panel: it highlighted older customer
edits instead of the two whole orders added after preparation and not covered by
the physical delivery.

**How to apply:** Derive whole-order additions from recorded append events, not
customer edit history or the recorded vendor submission time. Offer those orders
preselected in the protected whole-order correction, with an Admin-chosen
destination. Only offer partial quantity moves for evidenced post-preparation
increases. Deduct prior moves and never guess when timing evidence is missing.

Keep released/undone batches out of the normal batch list, in collapsed history.
Their old contents are historical snapshots, not active allocations.

**Why:** The user approved removing an undone batch from the normal list while
preserving its audit history.

**How to apply:** Keep the database record and reversal evidence, suppress active
addition badges/actions for released snapshots, and never reuse their references.

The Admin chooses the destination batch in the panel for both whole-order corrections
and added-quantity moves; do not ask them to name the destination in chat or move live kits on their behalf.

**Why:** The user repeated that the destination must be “of my choosing” and clarified “choose it myself on the panel.”

**How to apply:** Offer unsubmitted same-region destinations and a new-batch option,
review exact quantities and both snapshots, and preserve customer payments.

Undoing a mistaken allocation move must restore the original batch and unchecked
package contents without changing customer quantities, prices or payments. Retain
the move and its reversal as history; retire an unused newly-created destination instead of
deleting it. Restore a pre-existing destination's prior allocations without releasing it.
Block undo when subsequent work or inspected receipts could be overwritten.

**Why:** The user approved a secure Admin Undo action after an additions move
incorrectly transferred the customer's original kits too.

**How to apply:** Validate the recorded post-move snapshots and current reservations
inside the same group transaction. A code change is not a live-data reversal:
with read-only production access, the user must publish and execute the Admin action.

Admin batch-member messaging belongs in the existing group-buy Broadcast form as
a supplier-batch filter, with all batch members or specific recipients.

**Why:** The user rejected the separate batch-message composer: "Just add a filter
rather than creating a new message system."

**How to apply:** Reuse the existing broadcast sender and recipient picker, not a
parallel composer. Intersect batch membership with selected recipients and other
active filters on the server; released, unavailable or empty batches must never
fall back to broadcasting to the entire group.

When an enabled supplier region reaches its kit target and Telegram alerts are enabled, notify both the configured Admin Telegram chat and the group-buy organiser. These are staff alerts, not member broadcasts.

**Why:** The user explicitly chose Admin and the organiser as recipients; organiser-only alerts do not notify the Admin who manages supplier purchasing.

**How to apply:** Keep a separate durable delivery for each recipient so retrying one does not resend the other's alert. Deduplicate within each readiness transition and include the group buy, region and kit count against its target, without member details.

Batch references start with **EU** for EU batches and **US** for US batches. UK batches keep **GB**, not UK.

**Why:** The user explicitly requested regional prefixes to distinguish batches at a glance.

**How to apply:** Use the batch's saved destination region, not the organiser's location or mutable region label. Keep batch numbers and allocations unchanged and show consistent references to staff, members and in downloads.
