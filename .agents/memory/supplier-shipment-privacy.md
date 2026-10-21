---
name: Supplier shipment privacy
description: Why batch supplier packages must remain separate from legacy member parcel feeds and how ambiguous Direct routing is handled.
---

Keep supplier batch packages private to staff and their assigned reshipper; reuse the tracking provider, not the legacy public/member parcel records.

**Why:** Existing parcel records also feed customer tracking, manifests and broadcasts. Reusing them for batch allocations could expose other members or send supplier tracking as a member's final delivery.

**How to apply:** Maintain recipient-scoped shipment projections and quantity-based inspections independently of carrier milestones. No supplier milestone may automatically change member fulfilment or money.

Members may view a minimal batch-status summary only when staff explicitly enable sharing for that group buy; sharing is off by default. They may see batch references, regions, kit counts, dates and their own active-batch marker—not customer lists, payments, addresses, staff notes or supplier tracking numbers.

**Why:** The user approved an optional “View batches” action in the group-buy card’s three-dot menu, conditional on enabling it. This is permission to share status summaries, not private supplier parcels.

**How to apply:** Enforce membership and the visibility setting on the server. Use explicit response fields, never spread staff snapshots. “Received by reshipper” requires inspected good quantities covering the batch, not a carrier’s delivered scan.

Treat an old `routingType=direct` without an explicit direct-shipping request as unresolved when allocating supplier packages.

**Why:** Direct is a historical default for unassigned orders, not evidence that the supplier is shipping to the member.

**How to apply:** Require explicit reshipper ownership or the member order's confirmed direct-shipping option; show an actionable exception rather than guessing from country or a default routing label.
