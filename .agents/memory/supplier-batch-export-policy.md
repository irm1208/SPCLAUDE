---
name: Supplier batch policies
description: Full FS3 supplier TXT requirements and the boundary for adding orders to existing batches.
---

Supplier batch TXT downloads must retain the full FS3 format, including supplier costs and delivery contact details. Do not silently substitute a quantities-only file when setup is missing.

**Why:** The user explicitly chose to keep the full format and show exactly what needs setting up, rather than allow incomplete downloads.

**How to apply:** Report missing supplier costs and invalid/missing recipient delivery details together. Never infer supplier prices from member retail prices or change reshipper assignments to make an export pass.

Existing batches may receive more eligible paid orders only while prepared, within the same region. Additions may be below the usual kit target; ordered and released batches must remain protected.

**Why:** The user explicitly chose same-region prepared batches only, including additions below the target, to avoid changing purchases already placed with the supplier.

**How to apply:** Show the combined totals before confirmation, preserve the batch reference, and require reviewing changed queue or destination snapshots again.
