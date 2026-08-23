---
name: Shared-order organiser wallet edit access
description: Prevent configured organiser payment destinations from blocking open shared-order item editing.
---

An organiser's configured wallet is where other members can pay their peer-to-peer fees. It must not make the organiser appear paid or prevent them from adding products while their shared order is open.

**Why:** Treating the wallet as a payment-started signal hid the organiser's product picker and rejected item saves before the order had any products.

**How to apply:** Keep the organiser's special bundled-payment treatment limited to locked/post-lock shared-order flows. For open shares, use real payment state to decide whether item editing is allowed.