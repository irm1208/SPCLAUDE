---
name: Crypto payment verification tolerance
description: Why on-chain crypto verification must use ~1% tolerance once amounts are locked-rate converted, not a loose 15%.
---

# Crypto payment verification tolerance

On-chain crypto verification (`verifyTransaction` in api-server payments) must use the
standard ~1% tolerance (its default `tolerancePct = 0.01`) in ALL verify paths:
manual submit-test, manual full `/orders/:id/pay`, and the background auto-verify.

**Why:** Historically the full-payment and auto-verify paths passed a loose `0.15`
(15%) tolerance to paper over fiat↔coin drift, because the "expected" amount was
sometimes treated as fiat/USD while the buyer paid in coin. Once the expected amount
is the exact coin amount converted at the rate locked at checkout (display==verify),
a 15% window is financially unsafe — it silently accepts large under/overpayment. Code
review will REJECT a 15% tolerance on money paths.

**How to apply:** When converting USD→coin at a locked rate, call `verifyTransaction`
WITHOUT a tolerance override so it uses the 1% default. Per-coin underpayment rounding
floors (USDT 0.02, ETH 1e-9, BTC 1e-8) live inside the per-coin verify helpers and are
fine to keep. Display amounts and verify amounts both derive from the same locked
`paymentUsdAmount` + `paymentCryptoRate`, so 1% only needs to absorb network dust.
