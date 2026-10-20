---
name: Supplier shipment privacy
description: Why batch supplier packages must remain separate from legacy member parcel feeds and how ambiguous Direct routing is handled.
---

Keep supplier batch packages private to staff and their assigned reshipper; reuse the tracking provider, not the legacy public/member parcel records.

**Why:** Existing parcel records also feed customer tracking, manifests and broadcasts. Reusing them for batch allocations could expose other members or send supplier tracking as a member's final delivery.

**How to apply:** Maintain recipient-scoped shipment projections and quantity-based inspections independently of carrier milestones. No supplier milestone may automatically change member fulfilment or money.

Treat an old `routingType=direct` without an explicit direct-shipping request as unresolved when allocating supplier packages.

**Why:** Direct is a historical default for unassigned orders, not evidence that the supplier is shipping to the member.

**How to apply:** Require explicit reshipper ownership or the member order's confirmed direct-shipping option; show an actionable exception rather than guessing from country or a default routing label.
