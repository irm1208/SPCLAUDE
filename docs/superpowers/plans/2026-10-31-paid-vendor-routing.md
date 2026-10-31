# Paid vendor routing implementation plan

Goal: Paid wholesale orders appear in their assigned vendor portal automatically; email is optional.

Approved behavior: The user confirmed automatic submission on payment without an admin preview step.

- [x] Reproduce email validation failure and make email optional while retaining required physical delivery fields.
- [x] Test automatic submission, repeated runs, unpaid orders and recalled shipments using rollback PostgreSQL fixtures.
- [x] Reuse prepareVendorShipments and its transaction locks, payment/refund checks, supplier prices, delivery checks and audit entries for automatic submissions. Preserve recalled shipments for manual review.
- [x] Add a bounded background scan registered with scheduler-registry, triggered by the existing payment reconciliation hook as well as periodically. Expose errors in scheduler status and retry blocked orders.
- [x] Label the admin manual submission panel as a fallback; verify model, worker and integration tests.

Existing paid orders are included in reconciliation. No real order submission is part of verification; integration fixtures roll back.

Validation: 36 focused unit/payment-routing tests passed. PostgreSQL rollback tests passed for optional email, automatic submission/idempotence, unpaid initial and balance payments, recall, mixed-vendor routing and independent vendor failures. The broader integration run passed 20 tests but its migration test could not find the pre-existing 0021_multi_vendor_wholesale.sql fixture. API typecheck still reports unrelated existing errors (including admin-2fa.ts and backup code).
