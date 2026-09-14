---
name: Refund queue payment TXIDs
description: Defines which incoming payment references belong on protected Admin and organiser refund cards.
---

Protected refund cards show all recorded genuine chain transaction IDs from the original payment, additional payments, and balance/top-up payment. Preserve the original representation first and deduplicate equivalent EVM IDs across case and optional `0x`.

**Why:** Admins and organisers need to confirm whether the buyer paid, including later top-ups. Manual-payment markers such as `fiat:*`, `anonpay:*`, and test markers are references but not blockchain TXIDs and must not be presented as payment TXIDs.

**How to apply:** Reuse the shared transaction-ID validator, include pending top-up TXIDs when recorded, keep the outgoing refund transfer separately labelled `Refund TXID`, and never add incoming payment TXIDs to the customer-safe refund response.