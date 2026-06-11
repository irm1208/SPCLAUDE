---
name: Blood test US unit normalization
description: normalizeUnits() function in parsePDF.ts converts US lab units to SI/UK catalog units on PDF import
---

## Rule
`normalizeUnits(code, value, rawLine)` in `parsePDF.ts` detects units on the matched line and converts to catalog SI units before `results.push()`.

Conversion factors are consistent with `BT_UNIT_CONVERSIONS` in `CustomerPortal.tsx` (use that as the ground truth for display-side conversions).

| Code(s) | US unit | Detection | Conversion |
|---------|---------|-----------|------------|
| TEST, FTEST | ng/dL | `/\bng\/dl\b/i` | ÷28.842 → nmol/L |
| ESTR | pg/mL | `/\bpg\/ml\b/i` | ÷0.2724 → pmol/L |
| PROL | ng/mL | `/\bng\/ml\b/i` | ×21.2 → mIU/L |
| CHOL, LDL, HDL, NHDL, VLDL | mg/dL | `/\bmg\/dl\b/i` | ÷38.67 → mmol/L |
| TRIG | mg/dL | `/\bmg\/dl\b/i` | ÷88.57 → mmol/L |
| GLUC | mg/dL | `/\bmg\/dl\b/i` | ÷18.016 → mmol/L |
| CREA | mg/dL | `/\bmg\/dl\b/i` | ÷0.01131 → μmol/L |
| CA | mg/dL | `/\bmg\/dl\b/i` | ×0.2495 → mmol/L |
| BILI, DBILI | mg/dL | `/\bmg\/dl\b/i` | ÷0.05847 → μmol/L |
| TPROT, ALB, GLOB | g/dL | `/\bg\/dl\b/i` | ×10 → g/L |
| HEMO, MCHC | g/dL | `/\bg\/dl\b/i` | ×10 → g/L |
| FT3 | pg/mL | `/\bpg\/ml\b/i` | ÷0.6509 → pmol/L |
| FT4 | ng/dL | `/\bng\/dl\b/i` | ÷0.07752 → pmol/L |
| HbA1c | % (NGSP) | `/%/` + value <20 + no "mmol" | (v−2.152)÷0.09148 → mmol/mol |

**Why:** US labs (Quest, Labcorp) use different units than UK/EU. Without conversion, an imported US blood test would show testosterone as 512 nmol/L (instead of ~17.8 nmol/L) — wildly out of range.

**How to apply:** The unit string must appear on the same line as the biomarker value in the PDF (true for tabular US format). For visual-format UK PDFs the unit is in UK SI so the regex won't match and no conversion fires.
