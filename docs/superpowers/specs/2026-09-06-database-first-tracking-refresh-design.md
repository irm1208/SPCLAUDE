# Database-First Tracking Refresh

## Goal

Reduce 17TRACK API usage while continuing to show customers, organisers, reshippers, and administrators the latest tracking information saved by the application.

## Current Behaviour

Tracking status, carrier, event history, and last-checked timestamps are already stored in PostgreSQL. Normal page loads read these saved values. External API usage comes from scheduled refreshes, tracking-number writes, and manual refresh actions.

The scheduled worker currently considers active tracking records stale after approximately 90 minutes. Some refresh paths also register a shipment before requesting its tracking information, increasing the number of provider calls.

## Agreed Behaviour

- Read endpoints must continue returning persisted tracking data without waiting for 17TRACK.
- Active, non-final tracking records become stale after six hours.
- Delivered, expired, undeliverable, and other final records do not refresh automatically.
- Concurrent refresh requests for the same tracking record are deduplicated.
- A shipment that is already registered must not be registered again before every information request.
- Tracking provider responses are persisted atomically with their status, normalized events, carrier, and checked timestamp.
- Failed refresh attempts use a persisted or process-safe backoff so a failing provider cannot create a rapid retry loop.
- Manual refresh remains available, is rate-limited, and must not create duplicate provider work.
- Tracking-number changes may enqueue an immediate background refresh.
- Existing privacy rules remain unchanged. In particular, shared wholesale main and onward tracking events and numbers must retain their current masking and ownership rules.

## Architecture

### Shared refresh coordinator

Provider access will be routed through a common refresh coordinator keyed by the tracking domain and normalized tracking identity. The coordinator owns:

- stale/final-status checks;
- in-flight request deduplication;
- provider call rate limiting;
- registration state;
- failure backoff;
- atomic cache persistence.

Domain-specific persistence adapters will retain the existing storage boundaries:

- ordinary orders and package legs;
- group-buy parcels;
- standalone shipments;
- public tracking-link packages;
- shared wholesale main parcels;
- shared wholesale onward parcels.

### Scheduled refresh

The existing scheduler remains the automatic refresh mechanism. It runs often enough to find due work, but only records older than six hours are eligible. It must not perform provider work merely because a page was opened.

### Manual refresh

A manual action requests prioritized refresh work through the same coordinator. It may bypass the six-hour freshness check, but it cannot bypass per-record deduplication, rate limits, final-status checks, or authorization.

The user receives saved data immediately. Existing endpoints may return newly refreshed data when work completes quickly, but UI correctness must not depend on a blocking provider response.

## Data Integrity

- Compare-and-set guards must ensure a delayed response cannot overwrite a newer tracking number or carrier.
- Shared wholesale caches must use their existing share/member guards rather than ordinary-order cache writes.
- Event masking must happen before shared wholesale data is persisted or returned.
- Provider totals, statuses, or events are never accepted from a browser client.

## Error Handling

- Provider timeouts and errors retain the last successful cache.
- A failed attempt records enough timing state to suppress immediate retries.
- Manual actions report that the refresh could not be completed without deleting saved tracking information.
- Missing provider credentials disable refresh work without breaking database-backed tracking pages.

## Testing

Tests will cover:

- six-hour stale eligibility;
- final-status exclusion;
- concurrent refresh deduplication;
- registration reuse;
- failure backoff;
- compare-and-set protection after tracking-number changes;
- shared wholesale privacy/masking preservation;
- database-backed reads when the provider is unavailable.

## Out of Scope

- Adding a 17TRACK webhook.
- Replacing 17TRACK with another provider.
- Changing tracking UI or privacy rules.
- The separate iOS shared-wholesale chat overlap fix.