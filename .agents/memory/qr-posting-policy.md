---
name: QR posting and shipment status
description: Meaning of the group-buy Admin and organiser Order Posted action.
---

For group-buy Admin and organiser QR-code workflows, “Order Posted” means the order has shipped, not merely that its label has been handled.

**Why:** The user explicitly requested that posting update the order status so members see the shipment.

**How to apply:** Advance active orders to Shipped without changing payments or other orders. Preserve completed/cancelled states; unmarking the label as posted must not silently reverse fulfilment.
