---
name: Wholesale lab-report batch-prefix matching
description: How wholesale products are matched to lab-test CoAs by batch-code prefix, why the vendor prefix table is stale, and why some blends are intentionally unmatched.
---

Wholesale Lab Reports are matched to products by **batch-code prefix**, NOT by peptide name — product names are inconsistent, but batch codes reliably encode compound+dose (e.g. `RE10-0603`, `T/B1010-0402`). The matcher lives in the frontend lib and drives both a badge-visibility probe and the report popup; the server exposes a distinct-batch-codes list endpoint and a comma-separated `batchPrefix` filter on the lab-tests list.

**Word-boundary is mandatory.** Prefix match is `^(prefix)([^a-z0-9]|$)` case-insensitive. Without the boundary, look-alikes collide: `RE10`↔`RE100`, `HK50`↔`HK50KP20`, `TB10`↔`TB410`, `MO10`↔`M010`, `IP10`↔`IPA10`. A `/` counts as a boundary, so `HK50/KP20` legitimately matches the `HK50` single (the vial genuinely contains GHK-Cu) — that dual-listing is intended, not a leak.

**The self-contained alias map is deliberate.** The matcher does NOT reuse `peptide-groups.ts`. Both the product name and the table's compound name must resolve through the *same* identity function; mixing two resolvers buckets the two sides differently and silently drops matches.

**Why:** the whole point is high recall on the user's real data. Matching is at the COMPOUND level (all doses) on purpose.

**The vendor's authoritative prefix table is STALE relative to live lab data.** Real batch codes exist that are absent from the user's source table — confirmed: `GLO70` (table only had `GLO80`; all live GLOW tests are GLO70, GLO80 has zero), `T/B3030` (30/30 BPC/TB blend). Blends are matched by explicit ordered rules (GLOW/KLOW first, because their names also contain bpc/tb/ghk/kpv tokens and would otherwise trip the later co-occurrence rules). These real-but-untabled codes are included in the blend rules so GLOW and the 30mg blend actually match.
**How to apply:** if a product "should" have reports but shows none, first check whether its real batch-code prefix is missing from the static table, then reconcile — don't assume the table is complete.

**Some blends are intentionally left unmatched.** CJC±DAC/Ipamorelin, the Tesa/IPA/CJC triple, and SLU/BAM are skipped because the DB has genuine table/data contradictions (e.g. `CJND10` is labelled both as a no-DAC/Ipa blend AND as CJC-no-DAC solo). Guessing there risks showing the wrong CoA, so they keep the pre-existing no-badge behaviour rather than mismatch.

These helper endpoints follow the raw-fetch convention (like the pre-existing peptide-names endpoint) and are intentionally NOT in `openapi.yaml`, so no codegen is needed.
