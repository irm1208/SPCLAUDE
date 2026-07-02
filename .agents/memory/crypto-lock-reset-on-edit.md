---
name: Crypto payment lock reset on order edit
description: Any order edit that changes the total must clear the locked paymentUsdAmount; a threshold-based staleness check alone is not enough.
---

# Crypto payment lock reset on order edit

When an order's total can change, EVERY total-changing edit path must set
`paymentUsdAmount = null` (for non-paid-like orders) so the payment panel re-locks
the crypto amount to the exact new total on next open.

**Why:** The locked USD amount (`paymentUsdAmount`, shown as "Send X USDC/USDT")
is frozen when the payment panel opens. A symmetric ~3% staleness reconciliation in
`lock-usdt-rate`/`/pay`/auto-verify (re-lock when `abs(locked-current) > current*0.03`)
was NOT sufficient because: (1) small edits (e.g. removing a ~2% line item) drift
UNDER 3% so the lock is never refreshed, and (2) the reconciliation only fires when
the panel re-fetches. Result: customers saw a stale higher coin amount after editing
their order down — a money-integrity bug. The 3% window is only meant to absorb
exchange-rate drift over time, not order edits.

**How to apply:**
- Clear `paymentUsdAmount` on every total-changing edit: customer `PUT /orders/:orderId`,
  customer direct-shipping toggle (`PATCH /account/orders/:id/direct-shipping`), and the
  admin order/line-item edit paths (admin.ts already does this).
- Gate the clear on payment status: only clear when NOT paid-like. The canonical
  paid-like set is `["confirmed", "test_confirmed"]` (see `const PAID` in admin.ts,
  `paidStatuses` in gb-country-legs.ts). `test_confirmed` counts as paid-like (a test
  payment was already sent). Handlers hard-gated to `unpaid` (direct-shipping) can clear
  unconditionally.
- Keep the symmetric 3% reconciliation as a secondary safety net for rate drift.
