---
name: GB admin fee (fixed vs percent)
description: How the group-buy admin fee is modeled and where percentage fees are resolved.
---

# Group-buy admin fee: fixed vs percentage

`group_buys.admin_fee_type` is `'fixed' | 'percent'` (default `'fixed'`). The
order row always stores the **resolved** fee in `orders.admin_fee` +
`orders.admin_fee_label`; all downstream display reads those columns unchanged.

**Rule:** percentage fees apply to the **product subtotal** of each order.
**Why:** organisers' prior workaround was inflating product prices, so a percent
markup on the product subtotal matches what they already did.

**How to apply — percent logic lives only at fee *resolution* points:**
- Order create: capture GB fee config while the GB row is in scope, then resolve
  the amount *after* the product subtotal is known.
- Order customer-edit: re-look up the GB and recompute percent fees from the new
  subtotal so the fee tracks line-item changes.
- Organiser + admin "backfill admin fee" endpoints: per-order SQL
  `ROUND(product_subtotal * pct / 100, 2)`.
- Frontend Review page mirrors the same math so the displayed total equals what
  the backend will persist.

**Two consistency constraints (both had to be fixed during the build):**
- Direct-to-home orders never carry the admin fee. Zero it at the resolution
  point (not only at the insert) or the grand total includes a fee while the
  stored `admin_fee` is 0.
- On edit, only recompute a percent fee for orders that **already** carry a fee
  (`stored admin_fee > 0`). This mirrors the fixed path (which preserves the
  stored amount) and prevents an edit from retroactively adding a fee to a
  legacy order that never had one. The Review page applies the same gate.

**Every `grandTotal`/`productSubtotal` recompute site must include the admin fee, not just the "main" edit endpoint.**
Organiser-side order mutation surface is scattered across many small endpoints
(quantity edit, shipping split, mark/unmark OOS, bulk-add-product, apply-intl-
shipping, etc.), each doing its own inline `newGrandTotal = subtotal + extras`
arithmetic. It's easy to add a new one (or patch an old one) that forgets the
fee term — this is exactly how a customer's 10% fee got silently dropped when
an organiser edited their order.
**How to apply:** whenever you touch/add any endpoint that recomputes an
order's totals, grep the file for other `newGrandTotal =` / `newProductSubtotal
=` sites and route all of them through one shared helper (e.g.
`resolveAdminFeeOnRecompute` in `organiser.ts`) that applies the fixed-vs-
percent + "never add a fee that wasn't already there" rule, and make sure the
resolved fee is both included in the total AND persisted back to
`orders.admin_fee`/`admin_fee_label` (not just reflected in `grandTotal`).

**Country override rule:** enabled `adminFeeCountries` entries override the base
fee per member order using that order's delivery country. Match country names,
ISO codes, and the `UK` alias; fall back to the base fee when no enabled entry
matches. A percentage override is still applied to that member's product
subtotal. Customer review, order creation, percentage edits, and both admin and
organiser backfills must all use this same resolution rule.

**Why:** storing and displaying the country configuration is insufficient if
the customer group-buy projection, order query, or backfill omits it; each layer
then silently reverts to the base fee.
