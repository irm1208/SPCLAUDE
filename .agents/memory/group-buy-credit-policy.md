---
name: Group-buy credit opt-out
description: Turning off credit spending must preserve existing settlements and credit-ledger history.
---

Group buys may opt out of store-credit spending. Apply the restriction to new deductions, including top-ups and later payment-time spends, not to credits already applied to orders. Existing group buys remain enabled unless deliberately changed.

**Why:** The user wants organisers and Admin to be able to disallow credits per group buy. Previously applied credit is a payment commitment; changing policy must not increase settled liabilities or undo historical ledger entries.

The user expects the store-credit control in V2 GB setup, not a requirement to switch to the original organiser dashboard.

**Why:** The user explicitly said, “It should be in the GB setup.”

**How to apply:** Keep the credit policy configurable during setup and when editing an existing group buy.

**How to apply:** Check the current policy inside the debit transaction, not merely in checkout UI. Preserve idempotent replays of already-completed credit operations even after the policy changes. Missing group settings must not authorize a new deduction. Ordinary and shared-wholesale orders without a group-buy association retain their existing credit behavior.
