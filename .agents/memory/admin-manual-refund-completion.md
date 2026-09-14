---
name: Admin manual refund completion
description: Money-integrity rules for manually completing a crypto group-buy refund when automatic verification fails.
---

Manual crypto refund completion is an Admin-only verifier bypass. It requires one valid outgoing TXID, allows one optional top-up TXID, requires a bounded non-empty reason, and may recover requested, verification-failed, or stuck-verifying refunds.

**Why:** Operational verification providers can fail, but a recovery path must not bypass transaction replay protection, order/refund invariants, auditability, or customer notification.

**How to apply:** Use the same lock order and completion invariants as automatic verification; canonically check and deterministically claim both IDs; preserve entered pair order in evidence; supersede active attempts; atomically update refund/order/audit/notification; keep organiser access denied.