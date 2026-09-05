---
name: BMURFS physical-package integrity
description: Why paired BMURFS tracking cannot use primary-number delivery or automatically group historical numbers, plus concurrent-write hazards.
---

BMURFS supplies international and local identifiers for the same physical package. International “Delivered” may be a handoff, not customer delivery; the local leg is authoritative for completion.

**Why:** Treating every identifier as a package inflates package counts, while treating international delivery as final overstates progress. Historical arrays do not reliably identify which numbers belong together.

**How to apply:** Keep historical pairing explicitly reviewed; never infer it from prefixes, list order, or similar events. Keep this behavior BMURFS-only rather than extending dual-leg semantics to other couriers or shared-order/onward tracking without a new requirement. Manual pairing must not change purchased-label carrier/service settings.

Tracking edits must protect histories against concurrent refreshes, not just against changes to identifiers.

**Why:** An editor can read the old per-number cache, a refresh can save new events, and the editor can then restore the stale cache even though all tracking numbers still match. A number-only compare-and-swap does not prevent that race.

**How to apply:** Any read-modify-write of tracking must guard the cache and shipped-item attribution it read, as well as package identity. In Drizzle raw SQL templates, bind JSON arrays through JSON serialization and an explicit JSONB cast: direct JavaScript-array interpolation produces SQL tuples, unlike a typed JSONB-column update.