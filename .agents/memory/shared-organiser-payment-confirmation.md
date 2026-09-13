---
name: Shared organiser payment confirmation
description: Integrity rules for forwarding a shared wholesale collection from the organiser to the platform.
---

An organiser-to-platform payment exists only when the shared order has a valid organiser-owned collection wallet. Confirmation must lock the parent share and match the exact transaction hash, currency, and network that automatic verification checked before confirming the parent and creator order atomically. Never infer that the creator order is paid from wallet configuration alone; views must use its persisted payment status.

**Why:** Loading transaction A, verifying it, and then confirming only by share ID lets a concurrent submission replace it with transaction B before the confirmation lock. Synthesizing creator payment status from wallet setup also reports payment before funds are verified.

**How to apply:** Any submit, manual-confirm, auto-verify, or backfill path must use the shared transactional confirmation operation, reject no-wallet and duplicate-order-link cases, preserve member orders, and treat repeated confirmation as an idempotent no-op.