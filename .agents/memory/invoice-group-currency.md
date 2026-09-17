---
name: Invoice group-buy currency
description: How invoice seeding represents group-buy currencies, including stablecoins.
---

Invoice documents support fiat currencies only. Group buys using USD, USDT, or USDC must seed invoices as USD so generated invoices display dollar amounts; EUR and GBP remain their matching fiat currencies.

**Why:** Stablecoin group buys otherwise fall through the invoice seeder's default GBP value even though all customer-facing order amounts are dollar-denominated.

**How to apply:** Keep the group-buy-to-invoice mapping in one helper and use it whenever a new invoice is seeded. Existing saved invoices remain editable snapshots rather than being silently rewritten.