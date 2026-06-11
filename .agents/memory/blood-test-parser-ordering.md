---
name: Blood test parser ordering rules
description: BIOMARKER_SEARCH_INDEX ordering constraints and notWith guards required to prevent false pattern matches
---

## Rule
The BIOMARKER_SEARCH_INDEX in `parsePDF.ts` has ordering constraints that must be respected:

- **NHDL before HDL** — " hdl " (with spaces) is a substring of "non hdl cholesterol"; HDL has `notWith: ["non"]`
- **VLDL before LDL** — "ldl cholesterol" and "ldl-c" are substrings of "vldl cholesterol" and "vldl-c"; LDL has `notWith: ["vldl"]`
- **ACTB12 before VITB12** — "active b12" would match "b12 " pattern; VITB12 has `notWith: ["active"]`
- **CKMB before CK** — "creatine kinase-mb" contains "creatine kinase"; CK has `notWith: ["-mb", "myocardial"]`
- **THDL before CHOL** — "total cholesterol/hdl" contains "total cholesterol"; CHOL has `notWith: ["hdl"]`
- **FT3 notWith: ["total"]** — bare "triiodothyronine" pattern catches Labcorp format but must skip "Total Triiodothyronine"

**Why:** The parser does substring matching on lowercased lines. Longer/more-specific codes must appear before shorter codes whose patterns are substrings of the specific ones.

**How to apply:** Whenever adding a new biomarker with a name that is a substring of an existing marker's name (or vice versa), add the more-specific one earlier in the array and add appropriate `notWith` guards.
