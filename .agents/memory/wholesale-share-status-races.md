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
- unlock: `WHERE id=? AND status='locked'` → sentinel `UNLOCK_CONFLICT` (see below).
- submit (`maybeSubmitSharedOrder` in lib/wholesale-submit.ts): `WHERE status='locked'`.

# Unlock reverses lock — race-safe via conditional DELETE on payment_status

`POST /wholesale-shares/:id/unlock` (organiser-only, status must be `locked`) reverts
a locked share back to `open` so items/delivery can be edited and re-locked. It must
UNDO everything lock did: revert the parent (status→open, null lockedAt /
totalVendorShipping / totalKits, conditional on status='locked' → `UNLOCK_CONFLICT`),
DELETE the materialised per-member orders (children cascade), and null each member's
`orderId`+`shippingShare`. Member draft `items` live on the member row and are
untouched by lock, so editing simply resumes.

**Rule:** the order deletion must be a SINGLE atomic conditional statement, NOT a
check-then-delete: `DELETE ... WHERE id IN (orderIds) AND payment_status='unpaid'
RETURNING id`, then `if (deleted.length !== orderIds.length) throw UNLOCK_HAS_PAID`
(→409, which also rolls back the reopen). An earlier SELECT-paid-then-DELETE was a
TOCTOU race — a payment could confirm between the check and the delete and get
deleted. Gating the DELETE on `payment_status='unpaid'` lets Postgres re-evaluate the
predicate against the latest committed row under the row lock, so a concurrently-paid
order is excluded, the short count aborts the unlock, and no confirmed order is lost.

**Why allowlist `unpaid` only (fail-closed):** order payment states are unpaid,
pending_confirmation, confirmed, test_ready, test_confirmed, refunded, rejected,
failed (rejection resets to `unpaid`). Blocking everything except `unpaid` means any
in-progress payment (even a just-submitted `pending_confirmation`) blocks unlock
without enumerating states — the organiser must CANCEL instead once anyone starts
paying.

**Why:** an earlier version ended lock/cancel with an unconditional
`UPDATE ... WHERE id=?`. Under a concurrent lock+cancel that let the loser's write
clobber the winner's status. Postgres row-lock + recheck on the conditional WHERE
makes whichever transition commits first win; the others match 0 rows instead of
overwriting.

# Delivery address: organiser picks WHO, recipient sets the ADDRESS

The organiser only picks WHICH member receives the parcel (`deliveryUsername`), and
can NEVER type an address on another member's behalf (anti-spoofing). When the
organiser changes the receiver, the server seeds the shipping snapshot from that
member's own saved account profile (`deliveryAddressFor(username)`), or clears it if
they have none.

The DESIGNATED recipient (and only them) may then set a one-off custom address for
that parcel via `PUT /wholesale-shares/:id/delivery-address` — it overrides their
saved account address for this share only, without changing their account. The
endpoint is receiver-only (`deliveryUsername === me`), validates name+line1+country,
and validates the country maps to a shippable vendor region (`pickRegionForCountry`)
both here AND at lock time. `buildShareResponse` exposes `delivery.canEditAddress`
(true when status=open AND current user is the deliveryUsername) so the UI shows the
address form. Members WITHOUT a saved address are NO LONGER disabled in the picker —
they can be chosen and then add an address themselves.

**Both delivery writers also obey the conditional-update rule above:** `PUT /delivery`
gates on `status='open'`; `PUT /delivery-address` gates on `status='open' AND
lower(deliveryUsername)=me`. Both use `.returning({id})` and respond 409 on zero rows
so a concurrent lock/cancel (or a receiver reassignment) can't mutate the shipping
snapshot of an already-locked share.

**Why:** the address must be enterable by the recipient (people aren't always
shipping to their saved account address), but letting the organiser type it would
re-open the spoofing hole — so editing is restricted to the recipient themselves.

**Required shipping fields are validated in THREE lockstep places.** A required
delivery field (name, line1, country, and now PHONE) must be enforced at all of:
(1) `PUT /delivery-address` body validation; (2) the `POST /lock` readiness guard
(`!share.shippingPhone` etc.); (3) the frontend `deliverySet` boolean that drives
the lock checklist + `canLock`. Enforcing only the form/Save button is NOT enough:
the organiser's `PUT /delivery` seeds the shipping snapshot from the recipient's
saved account, which can leave a field (e.g. phone) null without the recipient ever
opening the form — so lock-readiness must independently re-check each required field
or a blank one slips through to materialised orders. If you make another shipping
field mandatory, change all three spots together.

# "wholesale_shared" must be treated as wholesale in admin views

A locked share materialises per-member orders with `orderType="wholesale_shared"`
(line items attached, `groupBuyId=null`). Any admin code that classifies an order as
wholesale via `orderType === "wholesale"` must ALSO include `"wholesale_shared"`, or
shared orders silently vanish from the FS3 tab + the admin "Wholesale" order view and
land in "GB Orders" instead.

**Why / how to apply:** these wholesale gates are DUPLICATED and drift-prone — at
least the `isWholesale` flag computed in the `GET /admin/orders` formatter (drives
the wholesale=true filter + the frontend Wholesale tab) and the `routingType==="wholesale"`
filter in `GET /admin/fs3-summary`. The FS3 tab list is driven by `/admin/orders` +
`/admin/fs3-summary`, NOT by the GB-scoped `/admin/group-buys/:gbId/fs3-generate|fs3-submit`
endpoints (those stay GB-only). No single helper exists yet — consider an
`isWholesaleOrderType(orderType)` if a third gate appears.

# Per-member draft survives refresh via localStorage, NOT server auto-save

Each member's in-progress contribution on the shared page (`myItems` qty map +
`myTip`) is local React state, only re-seeded from the server when `!itemsDirty`
and only committed by the explicit "Save items" button. A pre-save refresh used to
wipe it. Fix = a localStorage safety net keyed per member+share
(`peps:ws-share-draft:${id}:${username}`): restore only while status is `open`,
write whenever `itemsDirty`, delete when saved/cancelled, and reset the per-key
restore guard when `id` or the signed-in user changes (the component instance can
be reused across shares).

**Why localStorage and not a debounced server save:** auto-saving a collaborative
order on every keystroke would (a) make every member's partial edits visible to
others mid-build and (b) re-introduce the status-race surface above. The manual
"Save items" call is the intentional commit point — keep it that way.

# Known residual (follow-up, non-blocking)

Generic payment-confirm sites (payments.ts, account.ts, admin.ts, organiser.ts,
order-payment-auto-verify.ts, vial-shop.ts) do NOT check `orders.status`, so a
member order CAN be marked paid after the share is cancelled (rare concurrent
race; UI already hides the pay action for cancelled shares). This cannot trigger a
vendor submission because `maybeSubmitSharedOrder` refuses non-`locked` shares — it
only leaves a paid-but-cancelled order needing a manual refund. Proper fix = a
central guard rejecting payment confirmation when `orders.status='Cancelled'`.
