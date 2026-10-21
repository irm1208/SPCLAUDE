---
name: Review shipping country
description: Why group-buy country changes return to postage selection while contact details are collected on review.
---

Group-buy shipping contact details belong on Review Order. Changing the destination country must return to delivery-option selection, rather than silently changing it underneath an already selected postage price.

**Why:** Country-specific options and kit-band rates depend on the destination. An editable review-country dropdown alone can leave a stale or ineligible postage choice. The user asked to move Shipping Details to review, not remove country-specific pricing.

**How to apply:** Keep a delivery-country selector with postage choices and a change-country link on review. Preserve draft contact information between steps; validate required EU contact fields before placing/updating an order, not before entering review. Top-ups retain their parent delivery details.

Address collection is courier-specific, not EU-specific. A custom courier requiring an address, including US Shipping, must collect name and address on Review Order. QR/label-only choices and top-ups retain their existing exemptions.

**Why:** US Shipping already required an address in the saved settings, but review only recognised EU postage IDs and Direct Shipping, so members never saw the address editor.

**How to apply:** Resolve the selected courier's current requirements and use them for both the editor and submission validation. Do not infer address requirements from a courier's name or country alone. Prevent submission if the requirements cannot be loaded.

Group-buy delivery country choices must follow that group buy’s allowed-country list and exclusions. UK and GB are one destination in the member dropdown.

**Why:** The user explicitly wants only allowed countries offered in the group-buy dropdown, rather than showing every country and rejecting the choice later.

**How to apply:** An empty allowlist means all countries except exclusions. A populated allowlist must not fall back to all countries while settings are loading or unavailable. Changing the destination requires choosing postage again.
