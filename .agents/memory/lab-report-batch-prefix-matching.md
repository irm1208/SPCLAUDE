---
name: Lab report matching must use batch-code prefix, not name+mgAmount
description: Why lab_tests.mgAmount exact-match matching is broken for GB/wholesale lab report popups, and the correct fix
---

# Lab report matching: use batch-code prefix, never exact mgAmount

`lab_tests.mg_amount` stores the **measured** potency from the certificate
(e.g. 11.57, 6.05), not the nominal label dose (10mg/5mg). Any matching logic
that does `eq(mgAmount, extractedDoseFromProductName)` (e.g. `mgSpecific: true`
entries in `peptide-groups.ts`, driving old `vendor`/`gbLabSupplier` name-based
`<LabReportPopup>` lookups) will almost never match, since measured values are
essentially never an exact integer.

**Why:** Confirmed via production data — Semaglutide lab tests have mg_amount
11.57/11.42/6.05/11.5/5.03 with batch codes like `OZ10-xxxx`/`OZ5-xxxx`. Exact
dose matching silently returns "No lab reports found" even when reports exist.

**How to apply:** Always match lab reports via **batch-code prefix**
(`resolveProductBatchPrefixes`/`anyBatchCodeMatches` in
`artifacts/peps-anonymous/src/lib/batch-prefixes.ts`, fetched in bulk from
`/api/lab-tests/batch-codes`), passing `batchPrefixes` into `<LabReportPopup>`
instead of `vendor`/`gbLabSupplier`/name matching. `WholesaleOrder.tsx` is the
reference implementation. This pattern has now been applied consistently to
`WholesaleOrder.tsx`, `GbOrganiser.tsx` (OrdersTab), `OrderForm.tsx` (customer
GB order form), and `Groups.tsx` (`GBInfoModal`). Any *new* lab-report trigger
point in the app must use this same batch-prefix approach, not the legacy
name/vendor/mgAmount one.
