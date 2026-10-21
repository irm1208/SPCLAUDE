# Reshipper fulfilment total-order TXT

**Goal:** Download one combined order per assigned reshipper, without member identities or individual order breakdowns.

**Design:** Each file contains the reshipper handle, aggregated product quantities, combined customer order total in the GB currency and total active kit quantity. Use all assigned active orders, not search-filtered cards. Exclude cancelled/refunded orders and OOS lines. Never change routing, order status or payments.

**Architecture:** A pure formatter uses the existing assignment filter; a reusable download control reads already-authorised organiser order data. Add a selector in Fulfilment (both list and board) and a download button on each reshipper column. Use the same control wherever the newer organiser exposes fulfilment.

- [x] Write and run failing formatter tests.
- [x] Implement formatter and reusable download control.
- [x] Wire active organiser fulfilment surfaces.
- [x] Test assignment scoping, aggregation, privacy, currency, half kits and UI downloading; build and check running app.

Verification: 20 formatter/routing/contract tests and 3 download component tests pass. Production frontend build passes. Shared reshipper management also exposes the selector in the newer organiser. The app runs, but the screenshot browser reaches authentication rather than the signed-in controls; those were verified through component tests.
