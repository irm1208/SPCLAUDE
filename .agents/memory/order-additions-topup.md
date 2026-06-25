---
name: Order additions / top-ups
description: How "addition" (top-up) orders must behave — free shipping + locked parent address, server-authoritative.
---

# Order additions (top-ups)

An "addition" (a.k.a. top-up) is a SEPARATE order a customer creates after a paid
order to add more items that ride along with the original shipment. It is linked to
its parent via a persisted marker column on the order row (`additionOfOrderId`,
non-null = addition). The big alternative (merge new items back into order 1) was
explicitly rejected as out of scope.

## The rule
An addition must PERMANENTLY have:
- FREE shipping — delivery price, vendor shipping, GB admin fee, and direct-shipping
  cost are all forced to 0/null.
- A LOCKED shipping address — copied from the parent at creation and never editable.

**Why:** The state used to be client-only (a `isTopUp` flag in the draft store).
Nothing was persisted, so editing the addition later re-computed delivery (€25) and
re-asked for the address. That is an abuse vector: free items shipped to a brand-new
address. Persisting the marker makes the server the source of truth.

## How to apply (every path must agree)
- **POST /orders**: validate the parent (exists, not deleted, not Cancelled, same
  telegram via safeEqual, same groupBuyId, parent is itself NOT an addition, parent
  not wholesale, and **parent paymentStatus === "confirmed"** — additions are only
  allowed on a paid order, matching the UI which only shows "Place Another Order" for
  confirmed orders). Then force all shipping charges to 0 and copy the parent's
  shipping + routing fields. Persist `additionOfOrderId`. Do this with a server-side
  override at the end of the insert — never trust client-sent prices.
- **PUT /orders/:orderId**: if `order.additionOfOrderId` is set, force the same
  zeroing and keep the stored (parent) delivery method + address + routing; ignore
  any client address.
- **POST /orders/:orderId/shipping-address**: 403 for additions (address is locked).
- **Frontend Review**: when `isTopUp`, zero BOTH delivery AND vendor shipping in the
  displayed totals (bake `isTopUp` into `vendorShippingIsKnown`/`vendorShippingIsTbd`)
  or the receipt overstates the amount the server actually charges.
- **Address cards** (AccountOrderDetail, Lookup): additions render a read-only locked
  address card, not the editable form.

## Plumbing note
`OrderResponse` in openapi.yaml is intentionally a subset; the frontend reads extra
fields like `additionOfOrderId` via `(order as any).X`. Do NOT expand the OpenAPI/codegen
just to surface a read-only marker.
