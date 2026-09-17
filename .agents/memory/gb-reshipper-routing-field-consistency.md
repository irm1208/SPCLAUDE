---
name: GB reshipper routing field consistency
description: Compatibility and write rules when reshipperUsername conflicts with routingType on Group Buy orders.
---

Treat a non-null reshipper assignment as authoritative when older order data conflicts with a stale `direct` routing marker. Manual assignment must set the routing type to reshipper; manual clearing must clear the username and set the route to unrouted.

**Why:** Historical manual assignment paths updated only the reshipper username. The organiser fulfilment board then trusted the stale routing marker first and displayed assigned orders under Direct Shipping even though their assignments were still stored.

**How to apply:** Any order-routing display must preserve compatibility with historical mismatches, and every admin or organiser path that assigns or clears a reshipper must update both routing fields atomically.