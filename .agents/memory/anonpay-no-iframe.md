---
name: AnonPay pages cannot be embedded
description: External AnonPay checkout presentation, restoration and browser-independent settlement.
---

Open AnonPay payment sessions as top-level Trocador pages, never in an iframe. Restore a persisted balance session only while its payment status is genuinely pending; unpaid or settled orders may retain historical session IDs.

**Why:** Trocador returns `X-Frame-Options: DENY`, so browsers block its page in an iframe and show a broken-document placeholder. Historical or manually reconciled orders can also retain stale AnonPay IDs.

**How to apply:** Render a styled external-payment launch card, keep confirmation and polling in the app, omit the `embed=1` presentation, and status-gate any session hydration.

Primary-payment reconciliation must not depend on the customer returning from Trocador or acknowledging that they started payment. A saved primary session can have completed while the local order still says Unpaid.

**Why:** Externally hosted checkout can finish after the customer closes the original page. Browser acknowledgement is not payment evidence, and its absence is not evidence of non-payment.

**How to apply:** Independently verify the saved session with the provider before settlement. Bind confirmation to the current session and money snapshot; do not overwrite refunds, cancellations or concurrent confirmations. Keep provider session IDs visibly distinct from outgoing blockchain TXIDs.

Do not assume every AnonPay amount is denominated in USD.

**Why:** Trocador's documentation defines `amount` as units of the receiving coin unless `fiat_equiv` is explicitly supplied. The current order integration requests the net USD number as stablecoin units; the sender's chosen coin is unrelated to that receive amount.

**How to apply:** Preserve the denomination of existing sessions. Any future non-stablecoin receiving support needs an explicit locked denomination/conversion policy, not a live-rate comparison against a USD order total. Reference: https://trocador.app/en/anonpaydocumentation