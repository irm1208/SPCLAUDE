---
name: Tracking refresh coordination
description: Durable integrity rules for scheduled and manual 17TRACK refreshes across v2.4 and legacy v2.2 paths.
---

Tracking reads stay database-first. Active records become automatically eligible after six hours; terminal records never auto-refresh. Manual refresh may bypass the six-hour freshness window, but not terminal exclusion, the persisted five-minute cooldown, provider failure backoff, or authorization.

**Why:** Provider usage can spike when schedulers and manual actions overlap. Delayed responses can also overwrite a newer tracking number, carrier, params, or package snapshot, and stale completions can emit incorrect notifications.

**How to apply:** Coordinate registration and lookup work by normalized number, carrier, params, and mutation generation. Keep v2.4 and legacy v2.2 protocol adapters separate. Strictly bind provider responses to the requested identity. Any delayed database write must compare-and-set the full observed identity/snapshot and only count, log, or notify after a successful guarded write. Carrier mutation must invalidate pre-mutation work and receive a fresh strict revalidation.