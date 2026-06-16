---
name: Wholesale shared-order status transitions
description: How the three parent-status writers (lock/cancel/submit) avoid clobbering each other, and the server-authoritative delivery address rule.
---

# Shared Wholesale Order — status-transition safety

The `wholesale_shares` row has status `open → locked → submitted` plus a `cancelled`
branch. Three code paths write that status and must never overwrite each other's
result (e.g. a concurrent lock resurrecting a just-cancelled share).

**Rule:** every parent-status writer must do its transition as a CONDITIONAL update
inside the same transaction that writes the child rows, gated on the expected
current status, with `.returning({id})`; if zero rows match, throw a module-level
`Symbol` sentinel to roll back the whole transaction and respond `409`.

- lock: `WHERE id=? AND status='open'` → sentinel `LOCK_CONFLICT` (rolls back the
  member orders it just inserted).
- cancel: `WHERE id=? AND status IN ('open','locked')` → sentinel `NOT_CANCELLABLE`.
- submit (`maybeSubmitSharedOrder` in lib/wholesale-submit.ts): `WHERE status='locked'`.

**Why:** an earlier version ended lock/cancel with an unconditional
`UPDATE ... WHERE id=?`. Under a concurrent lock+cancel that let the loser's write
clobber the winner's status. Postgres row-lock + recheck on the conditional WHERE
makes whichever transition commits first win; the others match 0 rows instead of
overwriting.

# Delivery address is server-authoritative

The organiser only picks WHICH member receives the parcel (`deliveryUsername`).
The address itself is read server-side from that member's own saved account
profile (`deliveryAddressFor(username)` / `membersWithAddress()` in
wholesale-shares.ts) — never trusted from the request body. `buildShareResponse`
exposes `hasDeliveryAddress` per member so the UI can disable members who have no
saved address.

# Known residual (follow-up, non-blocking)

Generic payment-confirm sites (payments.ts, account.ts, admin.ts, organiser.ts,
order-payment-auto-verify.ts, vial-shop.ts) do NOT check `orders.status`, so a
member order CAN be marked paid after the share is cancelled (rare concurrent
race; UI already hides the pay action for cancelled shares). This cannot trigger a
vendor submission because `maybeSubmitSharedOrder` refuses non-`locked` shares — it
only leaves a paid-but-cancelled order needing a manual refund. Proper fix = a
central guard rejecting payment confirmation when `orders.status='Cancelled'`.
