---
name: Site typography attempts
description: Rejected font-swap attempt and rules for future de-AI design work on Salt&Peps.
---

# Site typography — rejected blanket swap (July 2026)

A site-wide swap (Instrument Sans body + Bricolage Grotesque headings + grain texture on dashboard bg) was built, then REVERTED — user reacted "it looks horrible."

**Rule:** never blanket-swap fonts/styles site-wide to fix the "AI-generated look." Brainstorm direction first, show side-by-side canvas mockups, get approval, then apply.

**Why:** the user's complaint is holistic (icons, text colors, boxes/cards, texture, "no human feel") — a font change alone reads as arbitrary and worse. Direction must come from the user reacting to rendered options.

**Technical notes still valid if fonts change later:**
- Fonts load in TWO places: `index.html` Google Fonts `<link>` (Inter + Plus Jakarta Sans) AND a CSS `@import` at top of index.css (DM Serif Display + Inter 300–800). Both must stay in sync; h1–h6 use `--font-sans`, `--font-display` (DM Serif) drives Tailwind `font-display` used by ~15 files (Home.tsx aliases it `SERIF`).
- Instrument Sans has no weight above 700 — `font-extrabold` clamps.
- SVG-noise data-URIs are fine under the CSP (`img-src data:`).
