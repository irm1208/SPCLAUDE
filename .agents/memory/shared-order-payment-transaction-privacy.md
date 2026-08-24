---
name: Shared-order payment transaction privacy
description: Access rule for member payment transaction IDs and amounts in shared wholesale orders.
---

Member test-payment and remaining-payment transaction IDs, together with their
received amounts, are private reconciliation data. They may be shown to the
shared-order organiser, but must be omitted from every non-organiser response
rather than only hidden by the client.

**Why:** An organiser needs these values to reconcile member payments, while
other participants have no need to see another member's transaction history or
payment amounts.

**How to apply:** When exposing shared-order member payment data, gate the
server payload on organiser identity first. The client may render the data only
from that organiser-only response shape; do not rely on a visual condition to
protect it.