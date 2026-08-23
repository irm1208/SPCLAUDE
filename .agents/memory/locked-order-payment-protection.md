---
name: Locked-order payment protection
description: Preserve locked shared-order payment state across any reconciliation pass.
---

For a locked shared order, treat every order whose payment status is not `unpaid` as payment-protected. Reconciliation may increase its outstanding balance only when there is a positive total delta and no existing balance amount, status, proof, transaction reference, or confirmation; it must never reduce its recorded total or clear the original payment lock.

**Why:** A payment attempt can already be in flight before confirmation. Treating only confirmed payments as protected lets a later fee, recipient, or shipping reconciliation invalidate an amount a customer is actively paying.

**How to apply:** Use the same non-unpaid predicate in every total-affecting pass, including secondary fee/exemption reconciliation after a member-removal plan and read-route self-healing. When recalculating a shared total, include its materialised organiser fee and preserve independent extras. Primary-payment confirmation paths must not zero `amountDue`, because it is an independent post-payment balance.