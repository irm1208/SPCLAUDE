# Refunds before vendor submission

Approved policy: refunds may proceed before vendor submission, including a
Processing order that has not actually been submitted. Once any active allocation
has been submitted, block new refund requests and unfinished refund processing.
Completed refunds remove all remaining unsubmitted allocations and unchecked
manifest contents, with preserved history. Never rewrite a submitted purchase or
an inspected receipt. Existing completed refunds remain idempotent.

Implementation: share the supplier group mutex across refund and batch writers;
check every active snapshot (including partial allocations), not order status
alone; enforce credit, verified crypto, and Admin manual completion. Reflect the
same availability in member views and explain the new error in staff screens.
Recalculate prepared snapshots and invalidate stale tokens atomically with refund
completion. Empty prepared batches are released, not deleted.

Verification: isolated PostgreSQL fixtures, lifecycle unit tests, UI contract
tests, builds, API authentication and public preview. No production data changes.

Implemented and verified: 225 focused backend tests passed, including real credit
completion/replay, inspected-manifest rollback, all three completion modes blocked
after submission, partial allocation detection and concurrent request/submission.
11 component tests passed. Both production builds passed; touched files have no
TypeScript diagnostics, though the repository has unrelated existing diagnostics.

Broader refund mutation inventory audit: 4 existing failures remain. For example,
the baseline already has three refund order-update sites but the manifest expects
two; other failures reference unchanged reshipper/order writers and raw-write
inventory. No protection was removed or test expectation weakened to suppress them.
