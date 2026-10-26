---
name: Post-submit receipt must use server totals, not client draft math
description: Order create/edit success handlers that cache a "receipt" for the payment screen must source money fields from the server response, not pre-submission client state.
---

After creating or editing an order, the payment screen (`Success.tsx` via `PaymentPanel`) reads its charge amount from a client-written cache (`localStorage["peps:lastReceipt"]`), not from a live order fetch.

**Bug pattern:** the `onSuccess` handler that writes this cache was populating money fields (`grandTotal`, `productSubtotal`, `vendorShippingAmount`, `adminFeeAmount`, `creditsApplied`) from the client's own pre-submission draft calculations, ignoring the server's response — even though the server independently recomputes these (e.g. wholesale shipping tier, percentage admin fees) and can legitimately disagree with the client's guess. Net effect: editing an order (e.g. removing a line item that drops a shipping tier) could still show/charge the pre-edit total.

**Why:** any two independent computations of money (client estimate vs. server truth) will drift the moment either side's logic changes or has an edge case the other doesn't handle. The server write is always authoritative since it's what actually gets charged/reconciled.

**How to apply:** when a success/receipt handler receives the server's response object, prefer its fields (`data.grandTotal`, `data.vendorShipping`, etc.) over locally computed equivalents, falling back to local values only when the server didn't return that field. Exception: purely-local *display* flags that the server response can't represent (e.g. `vendorShippingIsTbd` — server always coerces shipping to a number, never `null`, so TBD-ness must stay a local/config-driven flag, not inferred from the server's numeric field).

Saved delivery details must not be requested again merely because payment has finished. Prefer the authenticated order's address, including explicit missing values, over a cached receipt; only use cached address details when the receipt explicitly matches the current order.

**Why:** The user reported wholesale customers entering their address at checkout and then seeing a second, empty “Vendor Shipping” form. A payment confirmation does not indicate that an address is missing, and a global receipt cache can belong to a different order.

**How to apply:** Show the saved address when present, retain partial details when genuinely asking for missing information, and distinguish a failed address lookup from an empty address. Do not silently hide a missing-address requirement when the lookup fails.
