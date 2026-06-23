---
name: Order status timeline/stepper mapping
description: How to map a real order status to a visual fulfilment stepper without over-claiming progress.
---

# Order status → fulfilment stepper

The reshipper order card (and any future My Orders / organiser reuse of the same
"Timeline — Elevated" design) renders a 5-node stepper: Submitted, Paid, Packed,
Shipped, Delivered, derived from the real `order.status` + `order.paymentStatus`.

Rule: the highlighted "current" node must reflect ONLY the real status stage, never
a step the order has not actually reached.

**Why:** code review rejected an earlier mapping where `Submitted + paid` lit up
**Packed** as current and `Draft` lit up **Submitted** — both fabricate fulfilment
progress the order has not made. Same money/state-integrity spirit as the
crypto-verify tolerance rule: don't display state the data doesn't support.

**How to apply:**
- `current` (highlighted node) is status-driven only: Draft → none active (-1),
  Submitted → node 0, Processing → node 2 (packing in progress), Shipped → node 3,
  Completed → node 4. Cancelled → no stepper, red hero + "cancelled" message.
- `Paid` is a **payment-driven overlay** (✓ when paymentStatus confirmed/test_confirmed),
  independent of the fulfilment stage — so a Submitted+paid order shows Submitted
  active with Paid already checked, Packed still dim.
- A node shows a check when its milestone is genuinely passed (Submitted: rank≥2,
  Packed: rank≥3 i.e. shipped, Shipped: rank≥4 i.e. delivered, Delivered: Completed).
- Progress bar segments fill purely on status advancement (`i < current`), not on the
  Paid overlay, to stay monotonic.
- Faithfulness: omit fields the data doesn't have (no fabricated ETA / courier tags).
