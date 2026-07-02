---
name: Wholesale shared shipping split integrity
description: Why shared-wholesale per-member shipping must never be recomputed from a single order, and how it gets lost on edit.
---

# Wholesale shared shipping split integrity

A `wholesale_shared` order's `vendorShipping` is a CROSS-MEMBER split of the whole parcel's
shipping, computed once at share-lock time (`attemptLockShare` in wholesale-shares.ts) and
snapshotted onto BOTH the materialised order AND the `wholesale_share_members.shipping_share`
column. It cannot be reconstructed from a single order's kit count.

**Rule:** Never route a `wholesale_shared` order through the generic/customer order-edit or
wholesale-shipping-recompute paths. Those resolve shipping from one order's own items and will
drop the split (client sends `vendorShipping=0` → grandTotal recomputes to items-only).

**Why:** The customer edit handler's `isWholesaleOrder` gate only matched `"wholesale"`, so
editing a shared order (or the frontend `handleEdit` falling through to `/order`) silently
zeroed the shipping. Reverting items never restored it because the split lives at the share
level, not the order. This corrupted grandTotal → wrong (too low) payable amount = money bug.

**How to apply:**
- Block edits of `wholesale_shared` orders (PUT /orders/:orderId → 403; hide the frontend Edit CTA). Manage them from the shared order page only.
- To repair/keep totals correct, reconcile the order's `vendorShipping` + `grandTotal` from the member `shipping_share` snapshot on read (GET /account/orders/:id), unpaid-only.
- Any write that changes an unpaid order's total must (a) gate the UPDATE itself on `payment_status NOT IN ('confirmed','test_confirmed')` (not just the read) and (b) clear `paymentUsdAmount` to reset any locked crypto amount (see crypto-lock-reset-on-edit).
