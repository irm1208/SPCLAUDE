---
name: Qiyunle product-level turnover
description: Defines how Qiyunle OOS and restock periods must be measured across changing batch codes.
---

Track turnover from a product’s total mapped stock changing positive → zero, then zero → positive. Preserve zero/negative feed rows for transition detection, but normalize them to zero and never persist them as current positive batch inventory.

**Why:** Qiyunle replenishment normally arrives under a new batch code. Batch-level tracking left old batches permanently “open” and falsely marked products OOS while another batch was available.

**How to apply:** Aggregate every mapped batch before deciding a transition. Open at most one OOS period per product, and close it when any mapped batch restores positive total stock. Keep customer/admin inventory lists positive-only.