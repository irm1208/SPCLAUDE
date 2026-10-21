---
name: Lab-test purity policy
description: User-required purity failure boundary and the explicit HGH exception.
---

For lab tests, flag purity below 98% as failing. HGH fails below 95%; exactly 95% passes.

**Why:** The user requested “change the fail rate on lab tests to below 98%, but keep HGH as it is,” then clarified “HGH fails below 95%.”

**How to apply:** Preserve this policy when changing lab-test filters, badges, or pass-rate summaries. Do not let a redesign or extraction change introduce a different purity failure cutoff.

Dose-qualified HGH names, such as “HGH 36IU”, must retain the HGH threshold; HGH fragments and blends must not inherit it.

**Why:** A real HGH certificate at 95.696% showed “Low” even though canonical-name boundary tests passed. Its imported compound name included the dose, and one viewer colour calculation omitted compound context.

**How to apply:** Test the actual report viewer with imported, dose-bearing names and values exactly on either side of 95%, not only the shared helper with the bare name “HGH”. Keep frontend classifications and database metrics consistent.
