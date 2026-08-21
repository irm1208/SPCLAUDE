---
name: Shared-order admin override
description: Safely granting administrators control over shared wholesale orders.
---

Admin actions on a shared wholesale order must call the established creator-facing
workflows under an authenticated admin override, rather than directly updating the
parent row or member orders.

**Why:** settings, publishing, delivery selection, locking, reopening, cancellation,
fees, and member removal each contain their own conditional updates, transactions,
payment guards, and fee recalculation. A direct admin update can break materialised
orders or clobber a concurrent status transition.

**How to apply:** validate the admin secret first, then establish the share creator as
the workflow actor only for the requested share. Keep the client-side confirmation
warning for every mutation and preserve the existing open/locked/submitted/cancelled
constraints.