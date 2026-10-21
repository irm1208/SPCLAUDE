---
name: Solana payment validation
description: Public RPC limitations and choosing representative mainnet payment examples.
---

PublicNode can reject indexed methods such as `getTokenSupply` with “personal token required” while serving `getTransaction` and recent signatures without authentication.

**Why:** This was observed during read-only mainnet validation on 2026-10-21. An indexed-method rejection is not evidence that transaction verification needs new credentials or is unavailable.

**How to apply:** Diagnose the exact RPC method used by payments. Do not substitute token supply or a current wallet balance for proof of a transaction-specific receipt.

Recent transactions mentioning a stablecoin mint are not necessarily payments with a positive net receipt. Arbitrage or intermediate-token activity can leave that token's owner balances unchanged.

**Why:** Recent USDT mint-history examples initially contained no eligible incoming payment, while a representative transfer verified successfully.

**How to apply:** For a read-only live verification smoke test, select a successful transaction with a positive net owner receipt of the chosen mint. Skip zero-net examples rather than treating them as failed payments. Do not send funds or mutate orders to obtain a test fixture.
