---
name: Site typography
description: Font pairing, loading rules, and the Instrument Sans weight cap for Salt&Peps.
---

# Site typography (de-AI pass, July 2026)

Body = Instrument Sans, display = Bricolage Grotesque (headings h1–h6, dashboard wordmark/page titles/StatCard numbers via `FONT_DISPLAY` in dashboard-theme.ts). Replaced Inter + DM Serif Display everywhere.

**Rules:**
- Fonts load ONLY via the Google Fonts `<link>` in `artifacts/peps-anonymous/index.html`. A stale CSS `@import` in index.css once double-shipped Inter/DM Serif — don't reintroduce one.
- Instrument Sans has NO weight above 700: `font-extrabold`/`fontWeight: 800` on body text clamps to 700 (browsers do not fall back per-weight). If a true 800 is needed, use `FONT_DISPLAY` (Bricolage loads up to 800).
- `--font-display` drives Tailwind's `font-display` utility used by ~15 files (Home.tsx aliases it as `SERIF`, admin, lookup, portal h1s) — changing it restyles public + admin pages, not just the dashboard.
- Dashboard page background has a subtle SVG noise via `grain(dark)` in dashboard-theme.ts (data-URI, covered by `img-src data:` in the CSP).

**Why:** user asked to remove the "made by AI" look; frontend-design skill flags Inter-everywhere + zero texture as the top tells.
