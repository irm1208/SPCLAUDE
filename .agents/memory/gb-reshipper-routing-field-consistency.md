---
name: GB reshipper routing field consistency
description: Group-buy reshipper routing, shared country claim pools, and separation from supplier Direct Shipping.
---

Treat a non-null reshipper assignment as authoritative when older order data conflicts with a stale `direct` routing marker. Manual assignment must set the routing type to reshipper; manual clearing must clear the username and set the route to unrouted.

**Why:** Historical manual assignment paths updated only the reshipper username. The organiser fulfilment board then trusted the stale routing marker first and displayed assigned orders under Direct Shipping even though their assignments were still stored.

**How to apply:** Any order-routing display must preserve compatibility with historical mismatches, and every admin or organiser path that assigns or clears a reshipper must update both routing fields atomically.

dnd-kit drag overlays must not register the same draggable ID as the original card, and empty routing columns must remain full-column drop targets.

**Why:** The floating preview previously registered a second draggable, while only the short empty-state body accepted drops. Moves to an empty reshipper column could silently snap back even with an enabled reshipper and no batch locks.

**How to apply:** Keep overlays presentation-only; determine pointer drops by pointer position rather than how much of the large order card overlaps a column. Preserve batch-lock and refund safeguards.

Custom country postage routes through reshippers; supplier Direct Shipping is a separate, explicit member choice. The user chose a default minimum of 30 kits, with half kits counting as 0.5. Reaching the minimum must not automatically switch the member's shipping choice.

**Why:** Germany EU pickup postage was incorrectly classified as Direct Shipping because routing checked only a reshipper's first country and defaulted unmatched orders to direct.

**How to apply:** Resolve all assigned countries with country-name and UK/GB alias normalization. Honour an Admin-selected postage reshipper only within their enabled country coverage. Ambiguous ordinary postage must remain unassigned, never become Direct Shipping. Enforce direct-shipping eligibility on the server as well as in the picker; do not bulk reclassify historical orders without review.

Multiple reshippers assigned to the same country share automatically routed, unassigned orders. Claiming gives exclusive ownership to one reshipper, not shared ownership of the order. My Orders should contain owned work, with available work kept separately in Unclaimed.

**Why:** The user clarified that both US reshippers must be able to claim orders, superseding the earlier request to send all US postage to one recipient.

**How to apply:** Keep automatic postage routing unassigned when more than one reshipper covers the destination. A country-leg setup must not be required for the shared pool. Claims must never steal existing assignments or include supplier Direct Shipping. An explicitly reserved Admin postage option remains reserved unless Admin changes it to automatic routing.