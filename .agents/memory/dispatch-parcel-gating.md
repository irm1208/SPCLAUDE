---
name: Dispatch tool parcel gating
description: Why GB dispatch could show zero reshippers/orders, and the rule that scope/visibility must not be gated solely on delivered parcels.
---

# GB Dispatch — visibility must not be gated solely on parcels

The Admin → Dispatch ("Dispatch & Packing Slips") tool's core job is matching
orders against *delivered* parcel stock (statuses in_transit/out_for_delivery/
attempted/delivered) and generating packing slips. That parcel-matching step
legitimately requires logged parcels.

The trap: reshipper discoverability and order *visibility* were ALSO gated on
delivered parcels. If a GB had orders + reshippers but nobody had logged any
parcels yet, the Reshipper scope showed an empty list and the All-Orders scope
showed nothing — admins couldn't even see their orders.

**Rule:** scope discovery (reshipper list) and the read-only Order Overview must
work independently of parcels.
- `scope-options` reshippers = UNION of delivered-parcel reshippers + the GB's
  *active* orders' reshipperUsername (deletedAt IS NULL, status != Cancelled).
- The Order Overview fetches `/admin/orders?groupBuyId=...` (optionally
  `&reshipper=`) directly, so it renders for both the reshipper scope and the
  All-Orders scope even with zero parcels (orders land in "Pending").
- Only the parcel-selection + compute step stays parcel-dependent.

**Why:** observed live — a GB had many Submitted orders across 2 reshippers but
zero `gb_parcels` rows, while parcels existed for other GBs, so the feature itself
worked. This was a UX/data-visibility gap, not a parcels bug.

**Normalization gotcha:** `/admin/orders` matches reshipper case-insensitively and
@-stripped (`lower(reshipperUsername) = lower(strip@(param))`). When deduping the
reshipper pill list, dedupe by lowercased+@-stripped key but keep original casing
for display — do NOT force-lowercase the pill, and pass the @-stripped value back
so the downstream order filter still matches.
