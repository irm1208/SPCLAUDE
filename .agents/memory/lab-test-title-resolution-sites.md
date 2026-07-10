---
name: Lab test certificate title resolution sites
description: Where batch-code-to-compound-name resolution for lab test titles must be kept in sync across the app
---

Lab test certificate titles (e.g. "ZE10" batch code → "Tirzepatide 10mg") are resolved from THREE independent code paths that must all agree, since there is no single shared title-builder function:
- `pages/LabTests.tsx` (`buildTestTitle`/`getCompoundBaseName`, the main `/tests` page)
- `pages/PrototypeLabTests.tsx` (duplicate of the above, live at `/prototypetests`)
- `components/LabTestsPopup.tsx` (`TestCard`, used everywhere else: OrderForm, Groups, GbOrganiser, CustomerPortal, WholesaleShared, WholesaleOrder, PeptideDetail via LabReportPopup/LabTestsListPopup)

Resolution order in all three: try `resolveUtherName(supplier, batchCode, "")` (uther-batch-codes.ts, supplier-gated, only matches supplier==="Uther") first since it preserves exact legacy blend phrasing; if empty, fall back to `resolveBatchPrefixName(batchCode)` (batch-prefixes.ts, supplier-agnostic prefix table with separate compound+dose fields); if both fail, use the raw stored `peptideName` (which can be messy, e.g. "tir10mg").

**Why:** `LabTestsPopup.tsx` originally had ZERO batch-code resolution — it rendered raw `t.peptideName` straight from the DB, even for Uther rows with messy stored names. Fixing only the main `/tests` page left every other page's certificate popup showing wrong/ugly names. A generic "admin data-entry" view (`components/LabTestsTab.tsx`) intentionally shows raw `peptideName` for editing — do not add resolution there.

**How to apply:** Any future change to title-resolution logic (new prefix table, new supplier, new normalization rule) must be ported to all three sites above, not just the main page.
