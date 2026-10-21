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

The batch supplier TXT workflow deliberately retains the FS3 reshipper flat
package rate even with the newly required saved supplier delivery country.
Direct supplier downloads retain regional tier pricing. Supplier purchase costs
use the FS3 catalog with exact product names; missing costs block export rather
than substituting customer selling prices or guessing across doses.

**Why:** The user requested the existing FS3 supplier ordering format and workflow,
not a change to supplier commercial rates. Requiring a contact country is not
permission to change package pricing.

**How to apply:** Keep a supplier-rate change separate from contact collection.
Supplier addresses belong to reshippers, not the members whose kits are grouped
in the shipment; never export those members' home addresses in a reshipper block.

**How to apply:** the direct / wholesale / shared blocks resolve the region from
the order (or shared-order anchor) country and tier-price it. Fallbacks (region
unmatched, custom/per-kg region, vendor not loaded) use flat $70 but still split
at 25 kits/package. Zero-kit orders are $0 (match the server calc, never min-1).
