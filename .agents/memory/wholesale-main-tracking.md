---
name: Wholesale shared main-parcel masked tracking
description: How the vendor→recipient MAIN parcel tracking is cached, masked, and refreshed for wholesale SHARED orders (presented like the public GB parcel tracking).
---

# Wholesale shared MAIN-parcel masked tracking

Lets every participant of a wholesale SHARED order see the MAIN parcel (vendor → the
one recipient) tracking that admin adds on the Shared Orders group header. Reuses the
onward masked-tracking plumbing (`maskTrackingNumber`, `sanitizeOnwardEventsForParticipant`,
`fetchOnwardTracking`) but is PRESENTED like the public GB parcel tracking (dotted number
+ carrier + status + events visible to all members).

## Source of truth vs cache
- `orders.trackingNumber` (on the `wholesale_shared` member orders) is the SOURCE OF
  TRUTH — admin writes the same number to every member order.
- `wholesale_shares.mainTracking*` columns are a CACHE keyed by `mainTrackingNumber`.
  The cache is only trusted while its key still equals the live canonical order number;
  `buildShareResponse` suppresses cached status/events when they differ (feed is being
  rebuilt for a newly-changed number). Canonical resolver prefers `trackingNumber`, then
  `trackingNumbers[0]`.

## Masking / privacy (presented like the public GB parcel tracking)
- Only the parcel recipient sees the RAW number. Everyone else gets a fully-dotted masked
  number (`maskTrackingNumber`, identical to GB's `"•"`×6–12).
- The carrier, coarse status, and country-masked events ARE shown to ALL members (the UI
  renders the dotted number + carrier block for non-recipients too, with a small "the full
  tracking number is hidden for privacy" note). **Why safe:** `fetchOnwardTracking` already
  stores events with country-only locations and names/addresses stripped (`maskLocation`),
  so non-recipients never see the recipient's city; for non-recipients `sanitizeOnwardEvents
  ForParticipant` further collapses free-text statuses to a controlled enum.
- Carrier is gated on `mainCacheMatches` (same as status/events) so an admin number change
  doesn't briefly flash a stale carrier.
- **History:** originally mirrored the onward view (number+carrier HIDDEN from non-recipients,
  privacy note). Changed on explicit user request to "make it like the GB parcels masked
  shipping" → now shows the dotted number + carrier to all. Do NOT add a `trackingUrl` link
  for non-recipients — it would expose the raw number and defeat the mask.

## Refresh pipeline (no fetch in the hot path)
- **Never** fetch 17track inside the 6s-polled share GET. Refresh happens only via
  (a) an admin one-shot fire-and-forget when the number changes, and (b) the scheduled
  scan `refreshWholesaleMainParcels`.
- All cache writes are CONDITIONAL on the previously-read cache key (null-safe: `isNull`
  when it was null, else `eq`) and check affected row count via `.returning()`. A reset
  that matches 0 rows means another writer already reconciled → bail. **Why:** without
  this a slow/old fetch clobbers a newer number's feed (cross-process race).
- Same-process de-dup: `mainRefreshInFlight` Set collapses concurrent calls; a call that
  arrives mid-fetch sets `mainRefreshDirty` so the running wrapper re-runs once after it
  finishes (do/while loop). `alreadyFetchedNumber` is threaded through so a dirty re-run
  for the SAME unchanged number skips the redundant 17track call (admin-burst collapses
  to a single fetch). **Why:** a dropped in-flight call would otherwise lose a number
  change until the scan.
- Scheduled scan must ALSO self-heal a stale cache key even when the cached status is
  TERMINAL: include rows where `mainTrackingNumber IS DISTINCT FROM orders.trackingNumber`
  (in addition to the non-terminal-status branch). **Why:** if a guarded reset loses a
  cross-process race, the cache can pin to a terminal (e.g. delivered) OLD number that
  the status filter alone would never pick up again — it would stay stale forever.
- Scan inclusion mirrors the canonical resolver: match rows with a non-empty single
  `trackingNumber` OR a non-empty `trackingNumbers` jsonb array
  (`jsonb_array_length(coalesce(...,'[]'::jsonb)) > 0`).
