---
name: Group-buy excess half-kit offers
description: User-defined availability and claiming rules for filling unused halves of whole kits.
---

Keep inline half-kit offers compact and visually connected to the product picker, but separate from the new-order catalogue.

**Why:** The user disliked tall half-kit cards because they took too much page space, and asked to keep halves separate but visually connected to products.

**How to apply:** Prefer a collapsible, count-labelled section with compact product/price/Add rows rather than full-width card buttons. Keep claim confirmation, extra shipping, and existing-order eligibility clear.

The organiser chooses which remaining half kits to offer and when to publish them. Offers may be available both before and after the group buy closes.

**Why:** The user wants to fill excess halves when group-buy product quantities end in .5 and stated, “The group buy organiser decides when it should be put on.”

**How to apply:** Provide organiser/Admin control over which halves are offered; do not automatically publish every fractional quantity or tie availability solely to the group-buy open/closed state.

Once a half is claimed, remove it from the available list. Add it to an eligible existing order, or allow a member without one to create a new order.

**Why:** The user explicitly described this claiming flow and reiterated that ordered halves must disappear from the available list.

Members must be able to add multiple distinct available half kits to the same order, including when creating a new order.

**Why:** The user explicitly requested “Allow them to add more than 1 half kit to the order”; a one-offer checkout restriction was not intended.

**How to apply:** Keep normal shipping at the combined-order level. Preserve each offer's price and exclusive claim, and submit a new-order selection atomically rather than leaving a partially claimed basket.

**How to apply:** Keep offers group-specific and prevent the same offered half from being claimed twice. Remove a half as soon as its claim succeeds, without depending on a subsequent list refresh. New orders use normal GB delivery, vendor-shipping and fee rules rather than the offer’s supplementary existing-order shipping charges; the member approved this choice. Preserve the membership/entry-fee gate.

The “Fill remaining half kits” action on member group-buy cards and lists should open that group buy’s order page, not the separate half-kit page.

**Why:** The user wants members to reach the offers through the order page.

**How to apply:** Keep the availability gate; the order page shows published halves separately from the new-order catalogue.

Half-kit payments go to the GB organiser’s wallet or the applicable reshipper’s wallet, never the site’s main wallet.

**Why:** The user confirmed “go to the organiser wallet or reshipper wallet.”

**How to apply:** Keep payment display, original-order and extra-balance verification, AnonPay initiation, and background checking consistent. Missing local destinations disable the method rather than falling back to Admin; orders without claimed halves keep their existing routing.

When someone loses a simultaneous claim, apologise and show how many seconds earlier the half kit was taken.

**Why:** The user requested this wording rather than a generic unavailable message.

**How to apply:** Use the actual claim time for the exact advertised offer version, never invent a delay or confuse price changes with a taken half. Keep the message visible after refreshing availability.

Show inline available halves as a clear list, with readable names and prices.

**Why:** The user rejected the card grid because the items were barely visible and explicitly asked to “make it a list.”

**How to apply:** Preserve the order-page styling while using full-width rows; avoid adding light-surface utility classes to dark rows, since global theme overrides can defeat inline backgrounds.

Only advertise “Fill half kits” for a group buy with published halves still available. Remove the sign when all are taken, and show the offers directly on the order page.

**Why:** The user requested availability-specific links rather than links on every group-buy card, and wants the actual halves visible on the order page.

**How to apply:** Keep every member entry point tied to current published availability. With an eligible order, claim into that order. Otherwise explicitly start a separate half-kit checkout using normal GB shipping; do not reserve the half until submission or silently mix it into another draft.

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

Customers should not need to release reserved halves merely to add unrelated normal products to an otherwise editable order.

**Why:** A customer trying to add four vials was blocked by the whole-order half-kit safeguard. The safeguard must protect the reservation without preventing ordinary additions.

**How to apply:** Keep claimed halves and quoted supplementary charges unchanged, preserve applied credits/discounts, and charge only the additions. Paid orders retain confirmed payment and use the additional-balance flow. Removing or resizing a reserved half remains a separate organiser-controlled operation.
