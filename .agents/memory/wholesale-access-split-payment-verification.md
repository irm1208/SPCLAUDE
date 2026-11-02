---
name: Wholesale access split payment verification
description: Integrity rule for the test-payment plus remainder flow used to grant wholesale access.
---

The wholesale access fee is $5, not $50. Access-request explanatory copy must use the configured fee rather than a hardcoded price.

**Why:** The user explicitly requested $5 after seeing a $50 message.

**How to apply:** Keep the fee, returned store credit and member-facing message consistent. Existing issued payment requests retain their quoted terms; do not silently rewrite amounts already being paid.

The test transaction is part of the wholesale access fee. Only persist its hash after successful on-chain verification, then verify the final transaction against `access fee - verified test amount` in both immediate and background verification paths.

**Why:** The payment UI deducts the test amount from the final amount it asks the user to send. Verifying that remainder against the original full fee leaves valid requests pending forever and forces manual approval.

**How to apply:** Any change to wholesale access payment submission must keep the test endpoint, synchronous final check, and scheduled retry on the same wallet, currency, network, tolerance, and outstanding-amount calculation.