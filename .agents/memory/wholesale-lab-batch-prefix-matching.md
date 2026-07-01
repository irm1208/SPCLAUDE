---
name: Wholesale lab-report batch-prefix matching
description: How wholesale products are matched to lab-test CoAs by batch-code prefix, why the vendor prefix table is stale, and why some blends are intentionally unmatched.
---

Wholesale Lab Reports are matched to products by **batch-code prefix**, NOT by peptide name — product names are inconsistent, but batch codes reliably encode compound+dose (e.g. `RE10-0603`, `T/B1010-0402`). The matcher lives in the frontend lib and drives both a badge-visibility probe and the report popup; the server exposes a distinct-batch-codes list endpoint and a comma-separated `batchPrefix` filter on the lab-tests list.

**Matching is DOSE-LEVEL, not compound-level.** The user explicitly rejected compound-level recall ("Tirzepatide 10mg" must show ZE10 only, never ZE30/ZE100). Table entries carry a `dose` field; the product name's first `<num><mg|iu|mcg>` token (parentheses stripped first) must equal it exactly. Dose parsed but no exact table entry → return NOTHING (showing another strength's CoA is wrong); no dose in the name → all compound prefixes. The BPC/TB blend rule is dose-aware too (5→T/B55, 10→T/B1010, 30→T/B3030).

**Word-boundary is mandatory.** Prefix match is `^(prefix)([^a-z0-9]|$)` case-insensitive. Without the boundary, look-alikes collide: `RE10`↔`RE100`, `HK50`↔`HK50KP20`, `TB10`↔`TB410`, `MO10`↔`M010`, `IP10`↔`IPA10`. A `/` counts as a boundary, so `HK50/KP20` legitimately matches the `HK50` single (the vial genuinely contains GHK-Cu) — that dual-listing is intended, not a leak.

**The self-contained alias map is deliberate.** The matcher does NOT reuse `peptide-groups.ts`. Both the product name and the table's compound name must resolve through the *same* identity function; mixing two resolvers buckets the two sides differently and silently drops matches.

**Why:** the user sells per-strength vials and considers a different strength's CoA the wrong report — precision at dose level beats recall.

**The vendor's authoritative prefix table is STALE relative to live lab data.** Real batch codes exist that are absent from the user's source table — confirmed and added after verifying each code's `peptide_name` label in the DB: `GLO70`/`GL70`/`GL070` (all live GLOW data; table's GLO80 has zero), `T/B3030`, `RE100`, `RE15`, `ZE90`, `BP40`, `EPI10/50`, `IPA10`, `NAD500`, `M020`, `MT110`, `VIP10`, `TB420`, `SS100`, `KIS10`/`KS10` (Kisspeptin, whole compound missing from table), `KL80`, `HK50KP20`, `CUKP5020`. Blends are matched by explicit ordered rules (GLOW/KLOW first, because their names also contain bpc/tb/ghk/kpv tokens and would otherwise trip the later co-occurrence rules).
**How to apply:** if a product "should" have reports but shows none, first check whether its real batch-code prefix is missing from the static table (query distinct `SPLIT_PART(batch_code,'-',1)` groups and their `peptide_name` labels), verify the label, then add with its dose — don't assume the table is complete, and never add a prefix without checking the DB label.

**Some blends are intentionally left unmatched.** CJC±DAC/Ipamorelin, the Tesa/IPA/CJC triple, and SLU/BAM are skipped because the DB has genuine table/data contradictions (e.g. `CJND10` is labelled both as a no-DAC/Ipa blend AND as CJC-no-DAC solo). Guessing there risks showing the wrong CoA, so they keep the pre-existing no-badge behaviour rather than mismatch.

These helper endpoints follow the raw-fetch convention (like the pre-existing peptide-names endpoint) and are intentionally NOT in `openapi.yaml`, so no codegen is needed.
