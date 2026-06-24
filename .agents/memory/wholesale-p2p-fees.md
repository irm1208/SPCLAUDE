---
name: Wholesale shared peer-to-peer fees
description: Optional organiser/reshipper fees on wholesale_shared orders are paid peer-to-peer and must never touch order totals.
---

Optional per-participant **organiser fee** (paid to the share creator/organiser) and
**reshipper fee** (paid to the parcel recipient) on `wholesale_shared` orders.

**Rule:** these fees are settled SEPARATELY, peer-to-peer, and must NEVER be added to
any member's order `grandTotal`/breakdown or the vendor/admin accounting. Order total
stays `subtotal + shippingShare + tip` only.

**Why:** the admin order payment is a different money flow from informal peer fees;
bundling them would double-charge and corrupt admin/vendor reconciliation. This mirrors
the broader money-integrity stance (see crypto-verify-tolerance) — keep distinct money
flows isolated.

**How to apply:**
- The current parcel recipient is always EXEMPT from both fees. Compute exemption
  DYNAMICALLY in `buildShareResponse` (force to 0 when `isRecipient`) so a recipient
  change can't leave a stale non-zero fee on the new recipient.
- Fees are editable only while share `status === "open"`. The `PUT /fees` write must be
  transactional: row-lock the share (`.for("update")`) and re-assert `open` inside the
  tx, throwing a conflict sentinel → 409, so a concurrent lock/cancel can't be followed
  by fee writes.
- When a fee AMOUNT changes, reset the matching paid flag (`organiserFeePaid` /
  `reshipperFeePaid` → false) in the same update — a previously-confirmed fee must not
  stay "paid" after the organiser edits the amount.
- Paid is confirmed by the PAYEE: organiser confirms organiser fees; recipient confirms
  reshipper fees (`POST /fees/confirm`, payee-only, blocked once cancelled).
