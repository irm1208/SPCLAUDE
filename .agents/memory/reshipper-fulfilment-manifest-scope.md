---
name: Reshipper fulfilment manifest scope
description: The order feed is intentionally broader than the incoming-stock manifest a reshipper should see.
---

The reshipper order feed can include explicitly assigned orders plus unclaimed orders from the reshipper's country leg. Any fulfilment or incoming-stock aggregate must count only explicit assignments, canonicalize case and a leading `@`, and omit cancelled or refunded orders.

**Why:** Treating the mixed operational feed as a manifest overstates what the reshipper will receive. Historical assignment values can also differ by case or a leading `@`, so exact matching can silently omit valid orders.

**How to apply:** Keep the broader feed where claiming/unclaimed workflow needs it, but use assignment-specific filtering for manifests and totals. Match assignment ownership canonically at both the server query boundary and in client aggregates.