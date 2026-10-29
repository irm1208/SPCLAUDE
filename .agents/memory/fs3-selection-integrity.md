---
name: FS3 historical vendor identities
description: Why legacy and newer wholesale lines for one product can appear as separate FS3 summary groups.
---

Related FS3 policies:
- [TXT package pricing and supplier rates](fs3-txt-package-pricing.md)
- [Pasted-list purpose and format](fs3-pasted-list-purpose.md)

Older wholesale lines may have no saved vendor ID while newer lines for the exact same catalogue product have an explicit vendor ID. Do not assume these represent different physical suppliers, or rewrite historical order ownership just to combine a financial display.

**Why:** A read-only production investigation confirmed this mixed history. It generated duplicate-looking FS3 groups, and colliding display identities caused full-history quantities to remain visible beside selected-order quantities.

**How to apply:** Resolve unambiguous legacy supplier mappings for display, keep genuinely different suppliers separate, and verify transitions between full, filtered and selected totals—not just the arithmetic on an isolated row.

## Approved FS3 cost-name equivalences

The user confirmed that Na Semax 10mg and Na Selank 10mg use the saved Na Semax and Na Selank costs ($60 each at confirmation), and **NA KPV 30mg** uses the saved KPV 30mg cost ($110 at confirmation). Keep the ordered compound names in supplier documents.

**Why:** These were explicitly confirmed; a base-name or modified-compound match must not otherwise be inferred from a price-list substring.

**How to apply:** Resolve exact saved costs first, then these approved equivalents only. Keep exports and profit calculations aligned, allow identical case-variant prices, and reject conflicting prices. Other strengths require their own confirmed mapping.

## FS3 price-list ownership

The user requested filling UR / Uther's missing supplier-cost fields from FS3 on the **live site**, not in preview. Treat the legacy FS3 cost list as UR-specific, not a default source for a newly added vendor.

**Why:** The request names UR; copying this list to another vendor could silently price that supplier's products incorrectly. The live Admin API rejected a background shared-secret update, so the user approved an authenticated review-and-apply import action instead.

**How to apply:** Use the signed-in Admin flow for the live import, preserve existing costs and unrelated product fields, and do not claim live prices changed merely because the import feature was implemented in preview.
