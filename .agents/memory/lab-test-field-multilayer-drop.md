---
name: Lab test field multilayer drop
description: Sterility/heavy-metal fields silently disappeared across 4 separate layers; pattern for auditing any new lab_tests field end-to-end.
---

A single "field missing" bug report (sterility + heavy metals not showing for two Uther batches)
turned out to be caused independently at four different layers, each of which had to be checked and
fixed separately — fixing only one layer left the bug apparently unresolved:

1. **Extraction prompt** (`LAB_EXTRACT_PROMPT` in `organiser.ts` + `EXTRACT_PROMPT` in `gemini-lab-extract.ts`)
   didn't ask Gemini for the field at all, or didn't mention it could be single-test-type (sterility-only
   or heavy-metals-only) or buried in free-text Comments (Hg is often reported only in Comments, not the
   Results table).
2. **Extraction-result → form mapping** (`applyExtracted()` in `LabTests.tsx` / `PrototypeLabTests.tsx`)
   used a different field-naming convention than the rest of the app (`heavyMetalArsenic/Cadmium/Lead/Mercury`
   vs. everywhere else's `heavyMetalAs/Cd/Pb/Hg`) — extraction could succeed but silently fail to populate
   the form.
3. **Submit payload** — the frontend form had the field and displayed it, but the POST body to
   `/lab-tests/submit` / `/lab-tests/submit-pdf` never included it.
4. **Backend insert** — the route handler never destructured the field from `req.body` nor included it in
   the Drizzle `values` insert, so even a correct payload was dropped at the DB write.

**Why:** each layer independently "looks fine" in isolation (prompt returns null gracefully, form renders
an empty field without erroring, backend inserts other fields successfully) — there's no error, just silent
data loss, so you can't find the bug by reading any single file; you have to trace the field name through
prompt → extraction result → form state → submit payload → route handler → DB column.

**How to apply:** when a report says "field X is missing" for a lab/CoA/extraction-style feature, don't stop
at the first plausible cause. Grep the field name through every layer listed above (prompt, mapping, payload,
insert) before declaring it fixed. If the bug is about *specific existing records*, also check whether
already-submitted DB rows need a one-off backfill (targeted parameterized `UPDATE` against ground-truth data)
since a forward-only code fix does not retroactively repair rows already written with nulls.
