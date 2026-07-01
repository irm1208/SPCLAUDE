---
name: Wholesale order shipping server-authority
description: Customer-facing wholesale order shipping must be recomputed server-side, never trusted from the client.
---

# Wholesale (non-shared) order shipping must be server-authoritative

Customer-facing wholesale orders (`orderType === "wholesale"`) create/edit through `orders.ts`
POST `/orders` and PUT `/orders/:orderId`. Historically both took `vendorShipping` straight
from the client with only a `Math.max(0, ...)` clamp — no recomputation. Wholesale shipping is
priced by kit-count tiers per destination region, so trusting the client let a customer order
5 kits, then edit to add a 6th+ kit while keeping the cheaper/zero shipping first sent (dodging
the higher tier).

**Rule:** For wholesale orders, recompute shipping server-side from the active vendor's tier
table (same primitives the shared-order path uses): `getActiveWholesaleVendor()` (from
`routes/config.ts`) + `pickRegionForCountry(vendor, country)` + `calcTotalShipping(vendor,
region, kits)` (from `lib/wholesale-shipping.ts`). Kit count = sum of line-item quantities
(1 unit = 1 kit; clamp per-item to ≥0 so a crafted negative can't shrink the tier). A shared
`resolveWholesaleShipping()` helper in `orders.ts` does this for both POST and PUT.

**Why the fallback-to-client-value is intentional (not a bug):** the helper falls back to the
clamped client value only when shipping cannot be auto-calculated — no active vendor, the
destination country is not in any region's `countries` list, or the matched region uses
`priceNote`/`customNote` (per-kg / custom pricing). Those regions can't be priced by anyone
(the frontend also shows a note and submits `0`, expecting manual admin quoting). Rejecting them
would break the legitimate custom-pricing flow, so it was deliberately NOT done.

**How to apply / edge cases:**
- Additions (`additionOfOrderId`) stay forced to 0 (ride along free) — recompute is skipped.
- PUT falls back to the STORED `order.shippingCountry` when the edit omits it, so shipping can't
  be dodged by omitting the country on edit.
- Manual region selection on the frontend is NOT a hole for mapped countries: the server keys off
  the destination country, so it enforces that country's region regardless of which region the
  client claims (defeats picking a cheaper region). Only unmapped countries fall back — inherently
  manual.
- Orders are editable only in `EDITABLE_STATUSES = ["Draft","Submitted"]` (pre-payment), so this
  was a shipping-recompute hole, not a paid-order-editing loophole.
- Direct shipping (`directShippingRequested`) is mutually exclusive with wholesale and uses
  `directShippingCost`; the GB shipping waiver applies to group-buy orders, not wholesale — neither
  conflicts with the wholesale recompute.
- Admin/group-buy paths (`group-buys-admin.ts`, `gb-country-legs.ts`) set shipping intentionally
  (admin authority) — not customer-facing, out of scope.
