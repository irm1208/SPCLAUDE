---
name: Shared-wholesale admin order grouping
description: How the admin order list merges multiple wholesale_shared orders of one share into a single parent row, and its page-window constraint.
---

# Shared-wholesale grouping in the admin order list

Multiple `orderType === "wholesale_shared"` orders that belong to the same share
(same `sharedOrderId`) are merged into ONE collapsed parent row in the admin order
list, labelled with the LEAD username (the share's `creatorUsername`). Opening it
shows each member's summary (username — payment status, line items, shipping split
= `vendorShipping`, total = `grandTotal`) with a per-member "Manage" toggle that
reuses the full per-order card for admin actions.

**Why it works the way it does:**
- The list endpoint (`GET /admin/orders`) enriches each order with
  `sharedOrderCreator` / `sharedOrderRecipient` via a batch `wholesale_shares`
  lookup keyed by `sharedOrderId` (lead = creatorUsername, recipient = deliveryUsername).
- Grouping happens **client-side, only over the currently loaded + filtered page**
  (server pagination, pageSize 100), and **only in the `wholesale` / `all` order
  views**. Single-member shares fall back to a normal row.

**How to apply / gotcha:**
- Correctness depends on a share's member orders landing on the SAME page and being
  adjacent. Members are created in one transaction (shared `createdAt`); the list
  query adds secondary sort keys (`createdAt DESC, sharedOrderId, code`) so siblings
  stay deterministically adjacent. The only residual edge case is a same-share pair
  straddling the exact 100-row page boundary — if absolute grouping is ever required,
  fetch siblings by `sharedOrderId` or request all wholesale rows for the wholesale view.
- Order stats/counts stay computed over the flat `filtered` list (members counted
  individually), so KPIs are unaffected by the visual grouping.
