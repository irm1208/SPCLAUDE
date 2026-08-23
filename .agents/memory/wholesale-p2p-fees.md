---
name: Wholesale shared fee separation
description: Organiser fees are part of applicable shared-order totals; reshipper fees remain separate peer-to-peer charges.
---

Optional per-participant **organiser fee** (for the share creator/organiser) and
**reshipper fee** (for the parcel recipient) on `wholesale_shared` orders follow
different money rules.

**Rule:** an applicable organiser fee is materialised in a member's `grandTotal` at
initial lock and relock. The designated parcel recipient is always organiser-fee exempt.
Reshipper fees remain separate peer-to-peer charges and must not enter order totals.

**Why:** the organiser fee is a required part of what an applicable member owes for the
shared order, so omitting it produces a payment total that understates the configured
charge. Reshipper forwarding fees are still a separate money flow and must stay outside
the vendor/admin order calculation.

**How to apply:**
- The current parcel recipient is always EXEMPT from both fees. Apply that exemption
  when materialising an unpaid order. A recipient replacement that would change a
  payment-started member's organiser fee must be rejected before any locked-share
  writes; locked responses reflect the materialised order fee rather than inventing a
  misleading display-only exemption.
- For an existing unpaid order, reconcile a historically omitted organiser fee upward
  from the materialised base total. Preserve any independently recorded extra amount.
  Never mutate confirmed, test-confirmed, or pending-payment orders during this repair.
- Fees are editable only while share `status === "open"`. The `PUT /fees` write must be
  transactional: row-lock the share (`.for("update")`) and re-assert `open` inside the
  tx, throwing a conflict sentinel → 409, so a concurrent lock/cancel can't be followed
  by fee writes.
- When a fee AMOUNT changes, reset the matching paid flag (`organiserFeePaid` /
  `reshipperFeePaid` → false) in the same update — a previously-confirmed fee must not
  stay "paid" after the organiser edits the amount.
- Paid is confirmed by the PAYEE: organiser confirms organiser fees; recipient confirms
  reshipper fees (`POST /fees/confirm`, payee-only, blocked once cancelled).
