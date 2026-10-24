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

When an enabled supplier region reaches its kit target and Telegram alerts are enabled, notify both the configured Admin Telegram chat and the group-buy organiser. These are staff alerts, not member broadcasts.

**Why:** The user explicitly chose Admin and the organiser as recipients; organiser-only alerts do not notify the Admin who manages supplier purchasing.

**How to apply:** Keep a separate durable delivery for each recipient so retrying one does not resend the other's alert. Deduplicate within each readiness transition and include the group buy, region and kit count against its target, without member details.

Batch references start with **EU** for EU batches and **US** for US batches. UK batches keep **GB**, not UK.

**Why:** The user explicitly requested regional prefixes to distinguish batches at a glance.

**How to apply:** Use the batch's saved destination region, not the organiser's location or mutable region label. Keep batch numbers and allocations unchanged and show consistent references to staff, members and in downloads.
