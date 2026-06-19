---
name: Removed features — DNA/SNP and Health
description: Features permanently removed in June 2026 — do not restore or reference.
---

# Removed features

**Why:** These features were scoped out of the product. All associated code, database tables, and navigation entries were deleted.

## Removed (June 2026)

- **DNA profiles** — `dna_profiles` table dropped, all routes and UI removed
- **SNP features** — `@workspace/snp-database` dependency removed, all SNP-related code deleted
- **Health section** — removed from public navigation entirely

## How to apply

- Do not add back any DNA, SNP, or Health-related routes, components, or database tables
- If a future request references these, clarify with the user before doing anything — they were intentionally cut
