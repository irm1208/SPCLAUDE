---
name: Lab-test purity policy
description: User-required purity failure boundary and the explicit HGH exception.
---

For lab tests, flag purity below 98% as failing. HGH fails below 95%; exactly 95% passes.

**Why:** The user requested “change the fail rate on lab tests to below 98%, but keep HGH as it is,” then clarified “HGH fails below 95%.”

**How to apply:** Preserve this policy when changing lab-test filters, badges, or pass-rate summaries. Do not let a redesign or extraction change introduce a different purity failure cutoff.
