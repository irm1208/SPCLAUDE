---
name: Member regional batch visibility
description: Country privacy and eligibility rules for the group-buy card's View batches action.
---

Members may see only their own destination region's batch progress and history: EU destinations share the EU view, UK/GB share the UK view, and other regions remain separate. This requires the existing explicit member-visibility opt-in.

**Why:** The user specifically requested “x amount of 100” from the group-buy card's three dots, with members seeing only their country's/region's batches, not everyone's.

**How to apply:** Enforce this on the server, never by hiding other regions in the browser. Use active order destinations; for members without a usable order destination, use their joined country leg then profile country. Unknown destinations must not grant global access. Multiple legitimate order destinations may yield multiple corresponding regions. Match historical batches to snapshot country coverage rather than reusing a mutable region ID.

The filling count is the fully paid, unallocated, non-direct supplier queue, not the general group-buy MOQ total (which includes unpaid orders). Viewing progress must not prepare batches, mutate readiness or trigger staff alerts.

**Why:** Paid supplier-batch eligibility and general MOQ serve different purposes; member viewing must remain read-only and consistent with staff batch preparation.
