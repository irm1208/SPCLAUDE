---
name: FS3 TXT package (vendor shipping) pricing
description: How the FS3 admin order-TXT download prices packages, and why the reshipper leg stays flat.
---

# FS3 vendor-facing TXT package pricing

The FS3 admin tab's order TXT downloads price the "Package:" line using the
**active wholesale vendor's regional kit-count tier table** (the "Uther" vendor),
not a flat per-package fee. This mirrors the customer wholesale page and the
server calculator in `artifacts/api-server/src/lib/wholesale-shipping.ts`.

Rule: split kits into chunks of `maxKitsPerPackage` (25); each chunk is priced by
its own kit-count tier for the order's shipping-country region; line shows
`N x $X = $Y` when all packages match, else `$A + $B = $Y`.

**Why the reshipper download stays on the flat $70 fallback:** a reshipped parcel
ships vendor → reshipper, so the customer's `shippingCountry` is the *wrong*
country for that leg and there is no reliable reshipper destination country to
resolve a region. Tiering it by the customer country would be incorrect, so it is
left flat **on purpose** — do not "fix" it to use tiered pricing without a real
reshipper country.

**How to apply:** the direct / wholesale / shared blocks resolve the region from
the order (or shared-order anchor) country and tier-price it. Fallbacks (region
unmatched, custom/per-kg region, vendor not loaded) use flat $70 but still split
at 25 kits/package. Zero-kit orders are $0 (match the server calc, never min-1).
