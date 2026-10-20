---
name: Group-buy MOQ policy
description: User-approved meaning of MOQ, eligible quantities and optional member visibility.
---

MOQ is a target for the entire group buy, measured in kits. Half a kit counts as 0.5. It includes active paid and unpaid orders, not only fully paid orders.

**Why:** The user explicitly chose kit-based quantities and all active orders when defining the feature.

**How to apply:** Keep the group target separate from any per-member minimum. Do not silently change the count to paid-only or interpret units as individual vials.

Enabling MOQ and showing its progress to members are independent choices. Member visibility is opt-in; staff can use MOQ privately.

**Why:** The user requested an optional MOQ and a separate optional choice to show ordered quantities versus the target to members.

**How to apply:** Suppress private MOQ data in member responses as well as the UI. Reaching or missing the target does not itself authorize automatic cancellations, closing, refunds or payment changes.

Regional supplier batches are a separate concept: country or EU thresholds count fully paid orders only. Keep each order whole, permitting a batch to exceed its target (for example 95 kits plus a 10-kit order makes 105).

**Why:** The user plans large group buys with incremental supplier purchases by country/EU, needs exact member-order allocation, and explicitly chose fully paid eligibility and whole-order overflow.

**How to apply:** Do not change the global MOQ to paid-only when adding regional batching. Do not split orders to force an exact target or treat a regional threshold as permission to place an external supplier order.
