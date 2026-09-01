---
name: Order additions / top-ups
description: The invariant an "addition" (top-up) order must hold, and why it must be server-authoritative.
---

# Order additions (top-ups)

An "addition" (top-up) is a separate order a customer places after a paid order to
tack extra items onto the same shipment. It is linked to its parent by a persisted
marker column on the order row (`additionOfOrderId`, non-null = addition).

## The invariant
An addition must PERMANENTLY inherit its **group buy from the validated parent order**,
have **free shipping** (all shipping-type charges 0/null:
delivery, vendor shipping, GB admin fee, direct-shipping cost) **and a locked shipping
address equal to the parent's**. It is only allowed on a parent that is already paid
(`paymentStatus === "confirmed"`, the same state the UI gates the "Place Another Order"
button on) and that shares the parent's customer + group buy and is not itself an
addition / not wholesale.

**Why:** The state was originally client-only (an `isTopUp` flag). Nothing was
persisted, so re-opening the addition let it recompute delivery and re-enter the
address — free items to a brand-new address. The fix is to make the marker the source
of truth and re-derive the invariant on the server every time.

## How to apply
The invariant is cross-cutting: EVERY path that can read or mutate the order must agree,
or one path leaks the abuse vector back. That means create, edit, the dedicated
address-change endpoint (reject for additions), the review/receipt totals, and the
address display all independently honor "free shipping + locked parent address."
Never trust the client-sent group-buy ID, prices, or address for an addition — derive
them from the validated parent server-side. Downstream membership, product, limit, fee,
and routing checks must run against that parent-derived group buy.

**Why:** persisted browser drafts can carry a stale or missing group-buy ID. Rejecting
that mismatch blocks a valid parent-linked add-on; accepting the client ID instead risks
cross-group-buy products. Parent authority fixes both while preserving normal validation.

**Why this matters more than the individual edits:** a future change that adds a new
write path or a new total/line-item display will silently reintroduce the bug unless it
re-applies the invariant. Treat the marker as a contract, not a one-off patch.

## Plumbing note
`OrderResponse` in openapi.yaml is intentionally a subset; the frontend reads extra
fields like the addition marker via `(order as any).X`. Do NOT expand OpenAPI/codegen
just to surface a read-only marker.
