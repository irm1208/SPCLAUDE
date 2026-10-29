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

**How to apply:** Treat these as prior approvals for legacy products, not approval to borrow another supplier's prices. New equivalences require an explicit supplier-scoped Admin review in My Prices, including the compound and dose. Respect revocations; never infer other strengths or modified compounds. Preserve ordered names in supplier documents.

## FS3 price-list ownership

The user requested filling UR / Uther's missing supplier-cost fields from FS3 on the **live site**, not in preview. Treat the legacy FS3 cost list as UR-specific, not a default source for a newly added vendor.

**Why:** The request names UR; copying this list to another vendor could silently price that supplier's products incorrectly.

**How to apply:** Use the signed-in Admin flow for the live import, preserve existing costs and unrelated product fields, and do not claim live prices changed merely because the import feature was implemented in preview.

## Legacy pricing versus supplier identity

A missing modern product supplier ID does not mean the supplier is unknown: older orders may establish it through their shared order, order header, legacy catalogue label or group-buy manufacturer. Use that trustworthy identity for reviewed matches while preserving authoritative exact legacy costs. A known supplier must never borrow a legacy-scope alias.

**Why:** Restricting reviewed-match lookup to modern product/line supplier columns made valid Admin approvals unusable on historical orders even though supplier shipments could already resolve their owner.

**How to apply:** Keep ownership resolution consistent across exports, summary and selected-order margins, P&L and batch sheets; test inherited supplier identities, not only modern catalogue offers.
## Supplier downloads versus vendor submission

FS3 order TXT downloads must not be blocked by missing customer contact details. Include available details and clearly label missing fields, rather than inventing them. Keep actual vendor-portal submission validation separate.

**Why:** The user repeatedly needs the downloaded orders to send to the supplier and explicitly rejected a missing-email blocker on downloads.

**How to apply:** Do not reuse strict submission contact requirements for an Admin export. Preserve supplier cost, shipping calculation and vendor-isolation safeguards.
