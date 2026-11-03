# Supplier allocation move undo

Approved scope: an Admin-only action to undo a recorded whole-order or extra-quantity move. Restore the original source snapshot and affected unchecked package manifests, retire the now-unused prepared destination, and retain both the original move and the undo audit. Customer items, prices and payment fields are never rewritten.

Safety: use existing group/half-kit locks; compare both batch tokens and reconstructed post-move snapshots; lock orders, reservations and packages; reject subsequent changes, vendor-submitted destinations, checked receipts, shipped/deleted/unpaid orders and active refunds. Replay of the same undo is idempotent. Historical moves must work without new schema or startup repairs.

- [x] Add regression tests for undo, no double moves after undo, auth, stale state and receipt protection.
- [x] Implement transactional undo and expose an Admin-only endpoint.
- [x] Add a confirmation control beside the source correction, with reason, quantities, destination and payment reassurance.
- [x] Verify tests, production builds, normal authenticated boundary and workflow startup.

Live boundary: this session has read-only production database access. Publishing and clicking Undo in Admin are required; do not claim the live move was reversed by adding the control.

Verification: 94 backend tests and 10 component tests passed, including concurrent replay, partial and full moves, receipt/content/destination-package guards and stale UI tokens. Both production builds passed. A read-only dry run against the actual historical move reconstructed the 2-kit reversal and the original 64-kit source snapshot. No live records were changed.

Runtime: canonical workflow restarted successfully; API health returned 200 and unauthenticated Undo returned 401. Mobile screenshot showed the normal organiser authentication boundary. The signed-in control was verified by component tests, not a signed-in browser capture.
