---
name: Lab-test purity policy
description: User-required purity failure boundary and the explicit HGH exception.
---

For lab tests, flag purity below 98% as failing, but keep HGH's existing rule unchanged.

**Why:** The user requested “change the fail rate on lab tests to below 98%, but keep HGH as it is.”

**How to apply:** Preserve this policy when changing lab-test filters, badges, or pass-rate summaries. Do not let a redesign or extraction change introduce a different purity failure cutoff.
