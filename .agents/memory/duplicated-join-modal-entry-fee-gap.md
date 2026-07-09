---
name: Duplicated "Join a Group Buy" modals diverge on error handling
description: CustomerPortal.tsx and Groups.tsx each have their own copy-pasted join-group-buy modal; a feature (entry-fee payment gate) added to one was never ported to the other.
---

## Symptom
Customer sets up a group buy with an entry fee, tries to join via the "Join a Group Buy" modal, and just sees the raw server error text ("This group buy requires a one-time entry fee before you can join.") in red with no way to actually pay — no payment modal ever appears.

**Why:** there are at least two independent copies of the same-looking "Join a Group Buy" UI (`Groups.tsx` and `CustomerPortal.tsx`), each with its own `handleJoin`/`handleIdJoin`. The entry-fee flow (`EntryFeeRequiredError` → open `EntryFeePaymentModal`) had only been wired into `Groups.tsx`; `CustomerPortal.tsx`'s copy just did `setError(err.message)` for every error, silently swallowing the entry-fee case into a dead-end error string.

## How to apply
- When a bug report describes a modal/flow "not doing X", grep for the exact visible title text (e.g. `"Join a Group Buy"`) across the whole `src/pages` tree before assuming there's one implementation — duplicated modals with copy-pasted handlers are common in this codebase and drift independently.
- When adding a new error-branch/gate to one copy of a duplicated flow (entry fees, rule acceptance, country legs, etc.), grep for the same handler pattern (`instanceof EntryFeeRequiredError`, `EntryFeePaymentModal`, etc.) in sibling files and port the same wiring, not just the primary one.
