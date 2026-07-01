---
name: Wholesale shared main-parcel masked tracking
description: How the vendor→recipient MAIN parcel tracking is cached, masked, and refreshed for wholesale SHARED orders (reuses the onward masked system).
---

# Wholesale shared MAIN-parcel masked tracking

Lets every participant of a wholesale SHARED order see the MAIN parcel (vendor → the
one recipient) tracking that admin adds on the Shared Orders group header. Reuses the
onward masked-tracking plumbing (`maskTrackingNumber`, `sanitizeOnwardEventsForParticipant`,
`fetchOnwardTracking`).

## Source of truth vs cache
- `orders.trackingNumber` (on the `wholesale_shared` member orders) is the SOURCE OF
  TRUTH — admin writes the same number to every member order.
- `wholesale_shares.mainTracking*` columns are a CACHE keyed by `mainTrackingNumber`.
  The cache is only trusted while its key still equals the live canonical order number;
  `buildShareResponse` suppresses cached status/events when they differ (feed is being
  rebuilt for a newly-changed number). Canonical resolver prefers `trackingNumber`, then
  `trackingNumbers[0]`.

## Masking / privacy (mirror the onward view exactly)
- Only the parcel recipient (and admin) get the RAW number + carrier + full events.
- Every other participant (incl. a non-recipient organiser) gets a masked number, null
  carrier, coarse phase labels, sanitized events.
- **UI does NOT render even the masked number to non-recipients** — it shows a privacy
  note ("the tracking number and exact addresses are hidden"), exactly like the onward
  participant view (`sectionMyTracking`). The API still returns a masked value, but the
  screen hides it. **Why:** the task required reusing AND staying consistent with the
  onward system; rendering a masked number would break that consistency. A code review
  suggested rendering it — rejected on these grounds.

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
