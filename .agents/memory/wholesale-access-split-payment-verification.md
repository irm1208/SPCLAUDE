---
name: Wholesale access split payment verification
description: Integrity rule for the test-payment plus remainder flow used to grant wholesale access.
---

The test transaction is part of the wholesale access fee. Only persist its hash after successful on-chain verification, then verify the final transaction against `access fee - verified test amount` in both immediate and background verification paths.

**Why:** The payment UI deducts the test amount from the final amount it asks the user to send. Verifying that remainder against the original full fee leaves valid requests pending forever and forces manual approval.

**How to apply:** Any change to wholesale access payment submission must keep the test endpoint, synchronous final check, and scheduled retry on the same wallet, currency, network, tolerance, and outstanding-amount calculation.