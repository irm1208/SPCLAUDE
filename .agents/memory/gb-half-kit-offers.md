---
name: Group-buy excess half-kit offers
description: User-defined availability and claiming rules for filling unused halves of whole kits.
---

The organiser chooses which remaining half kits to offer and when to publish them. Offers may be available both before and after the group buy closes.

**Why:** The user wants to fill excess halves when group-buy product quantities end in .5 and stated, “The group buy organiser decides when it should be put on.”

**How to apply:** Provide organiser/Admin control over which halves are offered; do not automatically publish every fractional quantity or tie availability solely to the group-buy open/closed state.

Once a half is claimed, remove it from the available list and add it to the claimant’s existing order.

**Why:** The user explicitly described this claiming flow.

**How to apply:** Keep offers group-specific and prevent the same offered half from being claimed twice.

Only advertise “Fill half kits” for a group buy with published halves still available. Remove the sign when all are taken, and show the offers directly on the order page.

**Why:** The user requested availability-specific links rather than links on every group-buy card, and wants the actual halves visible on the order page.

**How to apply:** Keep every member entry point tied to current published availability. Inline claiming still adds to an eligible existing order; it must not silently become part of a new draft.

Both paid and unpaid orders can receive claimed halves. Paid orders keep their confirmed payment and receive an additional amount due for the half kit.

**Why:** The user selected “Paid and unpaid orders” with this payment handling.

**How to apply:** Never reset a paid order to unpaid or make the member pay the original order again.

Organiser/Admin can adjust each half-kit offer’s price, starting at half the current group-buy kit price.

**Why:** The user selected the adjustable-price option.

**How to apply:** Use the group buy’s currency and show the offered price before claim confirmation.

Unpaid claims remain reserved until the organiser/Admin releases them manually; there is no automatic payment deadline or expiry.

**Why:** The user chose manual release.

**How to apply:** Provide a management view for unpaid claims and an explicit release action rather than a scheduled expiry.

Organiser/Admin may add an extra delivery or vendor-shipping charge to each half-kit offer.

**Why:** The user chose “Allow an extra shipping charge.”

**How to apply:** Show all additional charges and the total before claim confirmation; do not silently duplicate the existing order’s shipping charges.

Half-kit offers do not accept coupons. Members may use credits only when the group buy permits them.

**Why:** The user selected “No coupons; allow credits if the GB permits.”

**How to apply:** Preserve existing order discounts and credits; do not redeem another coupon or extend an existing coupon discount to the offered half.

Shipping finalisation must replace only the ordinary base shipping, preserving the half offer’s explicit extra charges and its quoted price.

**Why:** Offers can be claimed before closing, when the organiser may still need to finalise shipping. Rebuilding the whole order at that point can apply coupons or fees to a half that was quoted without them.

**How to apply:** Keep offer charges immutable and reconcile later base-shipping differences through the normal unpaid or additional-balance flow.

Once a half is funded, later additions or shipping balances must not make that half appear unpaid again.

**Why:** A new outstanding balance is not evidence that an earlier half-kit purchase was never paid.

**How to apply:** Preserve settlement before clearing old balance-payment details or adding new debt.

Legacy financial requests must stay serialised until their server-side handler ends, even when the browser disconnects.

**Why:** A disconnected browser does not stop an asynchronous database write; releasing protection on socket close permits stale writes to overwrite a newly claimed half. Request-wide database locks also need separate connection capacity, or waiting handlers can exhaust the data pool.

**How to apply:** Treat handler completion, not browser connection lifetime, as the end of the protected operation. Do not share request-lock connection capacity with the data queries those requests need.
