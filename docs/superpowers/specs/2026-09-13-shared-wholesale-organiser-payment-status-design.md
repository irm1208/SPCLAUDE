# Shared Wholesale Organiser Payment Status Design

## Goal

When the organiser's combined shared-wholesale payment to the platform is verified on-chain or explicitly confirmed by an admin, persist the organiser's linked personal order as paid without changing any other member order. Repair historical confirmed shares through a safe, rerunnable backfill.

## Existing Model

- `wholesale_shares` is the authority for the organiser-to-platform payment. It stores the status, transaction hash, currency, network, and confirmation timestamp.
- `wholesale_share_members` maps each participant, including the creator, to the materialised personal order created at lock.
- `orders` stores each participant's own payment status.
- Members pay the organiser through organiser-owned payment destinations. The organiser later forwards the combined product and vendor-shipping amount to the platform.
- The current shared-order response can synthesize the creator as confirmed while leaving the creator's database order unpaid. This design removes that inconsistency after the platform payment is actually confirmed.

## Chosen Architecture

Create one server-side confirmation operation shared by:

1. automatic on-chain verification;
2. explicit admin confirmation; and
3. the historical backfill.

The operation owns validation, locking, status transitions, audit creation, and the decision whether a notification is necessary. Routes and schedulers do not reproduce those rules.

The operation returns a structured result:

- `confirmed`: the parent payment and/or organiser order made a real transition;
- `already_confirmed`: all required persisted state was already correct;
- a typed mismatch or invalid-state failure that the API can expose clearly.

## Matching and Validation

Before changing an order, the operation must establish all of the following:

- the shared order exists and is not cancelled;
- the shared order is submitted;
- automatic confirmation starts from a pending parent payment;
- manual confirmation starts from a pending parent payment with a stored transaction hash, currency, and network;
- historical repair starts from an already-confirmed parent payment with the stored payment identity required for a safe match;
- the creator member is uniquely identified by both `isCreator` and the share creator username;
- the creator member has a materialised `orderId`;
- the linked order exists;
- the linked order has `orderType = wholesale_shared`;
- the linked order's `sharedOrderId` equals the parent share ID;
- the linked order's username equals the share creator;
- the expected organiser-to-platform amount, computed by the existing product-subtotal plus vendor-shipping rule, is positive;
- for automatic verification, the transaction has already been verified against that amount and the configured admin destination.

Supplying organiser wallet details alone never satisfies these conditions.

If any identity, state, amount, or transaction condition cannot be established safely, the operation changes nothing and returns a specific error.

## Transaction and Concurrency

Run the database mutation in one transaction:

1. lock the shared-order row;
2. lock and validate the creator member row;
3. lock and validate the linked organiser order;
4. conditionally confirm the parent payment when the caller is completing a pending payment;
5. conditionally change only the organiser order from `unpaid` or `pending` to `confirmed`;
6. set the order confirmation timestamp only on a real transition;
7. insert one audit record for the organiser-order transition.

Already paid-like organiser orders remain unchanged. Member orders are never selected for update. Conditional writes make concurrent or repeated confirmation idempotent.

The audit record identifies the share, organiser order, confirmation source (`automatic`, `admin`, or `backfill`), and reason. It must not contain wallet secrets or unrelated member payment information. Its idempotency identity prevents duplicate audit rows if the same confirmation is repeated.

## Notifications

Notify the organiser only after a real confirmation transition commits. Repeated confirmations and backfill reruns do not generate duplicate notifications.

The existing automatic-confirmation message remains the user-facing pattern. Manual confirmation uses the same result path so it cannot diverge from automatic verification.

## API Behaviour

`POST /api/admin/wholesale-shares/:id/confirm-organiser-payment` remains the manual admin entry point.

- Success returns the resulting shared-payment and organiser-order status.
- A repeated request returns success with `alreadyConfirmed: true`; it is not treated as a conflicting second payment.
- Missing payment identity, incorrect linkage, invalid status, or unsafe matching returns a clear `409` or `422` response and leaves all rows unchanged.

The organiser submission route continues to store a pending payment and trigger immediate verification. It does not mark the organiser order paid.

## Historical Backfill

Provide a rerunnable server-side backfill command using the same confirmation operation with source `backfill`.

It considers only parent shares already marked confirmed. It updates only rows that pass all matching rules and whose organiser order is not already paid-like. It reports:

- scanned shares;
- repaired organiser orders;
- already-correct shares;
- skipped shares grouped by reason.

Unsafe rows are reported and left unchanged. A second run produces no additional updates, audits, or notifications. The backfill does not notify users.

## UI and Response Behaviour

Persisting the organiser order status allows existing admin, organiser, customer, order-summary, and payment-status components to use their normal `orders.paymentStatus` badges after reload.

Audit all affected shared-order response builders and cache invalidations:

- stop relying on a synthesized creator confirmation once the platform payment is confirmed;
- return the persisted organiser order status;
- invalidate/refetch the grouped admin shared-order view after manual confirmation;
- invalidate/refetch organiser and customer order data where the current mutation can affect it.

No duplicate payment-status field or new visual system is introduced.

## Tests

Use test-first development. Coverage must prove:

1. automatic verification confirms the parent payment and only the creator's linked personal order;
2. explicit admin confirmation does the same;
3. non-creator member orders remain unchanged;
4. wrong share, creator, linked order, order type, amount context, or payment identity is rejected atomically;
5. unverified or failed automatic checks leave both parent and order statuses unchanged;
6. repeated and concurrent confirmation is idempotent, with one audit and one notification;
7. already paid-like organiser orders are preserved;
8. locked-order and payment-protection rules remain intact;
9. the backfill repairs valid historical rows, skips unsafe rows, and is a no-op on rerun;
10. affected API responses and frontend views consume the persisted status and refresh after confirmation.

## Scope Boundaries

- Do not route shared organiser payments through the generic per-order admin payment endpoint.
- Do not mark the organiser order paid when payment destinations are configured or when a transaction is merely submitted.
- Do not alter member payment routing, organiser fee handling, order totals, or shared-order lock rules.
- Do not redesign payment UI.