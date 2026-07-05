---
name: Design subagent functional regressions
description: DESIGN subagents redesigning large feature-rich pages silently drop real functionality — always diff-audit against git HEAD before accepting.
---

**Rule:** When a DESIGN subagent redesigns a large functional page (1000+ lines with forms, URL params, server fetches), treat its output as visual-only until proven otherwise. Diff-audit against git HEAD (save a copy of the original, e.g. `/tmp/<Page>.orig.tsx`) before accepting.

**Why:** The LabTests.tsx redesign (3100→1300 lines) silently gutted: the entire Submit form (replaced with a stub), `?report=` deep-link modal open, the authoritative `/lab-tests/metrics` server fetch, CompareTab's source/vendor filters + share-graph + dot-click-to-modal (props kept in signature but dead), share-filters button, heavy-metals display, and the Uther-aware `buildTestTitle` card naming. LSP was clean the whole time — these are runtime feature losses, not type errors.

**How to apply:**
- Before delegating: save the original file; list the page's functional surface (URL params, server calls, forms, exports used by other files).
- After: grep the new file for each item (param names, endpoint paths, exported symbols) and check props aren't accepted-but-unused.
- Cheapest reliable fix for a gutted section is splicing the original code back verbatim (line-range via awk/sed) — original sections often already use compatible styling tokens.
- Re-run architect review after fixes; first review of subagent redesigns commonly FAILs on dropped features rather than new bugs.
