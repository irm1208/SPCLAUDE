---
name: Health Hub dashboard-idiom redesign
description: How the Health Hub + sub-apps were aligned to the DashboardShell/DashboardHome look, and the recurring token/idiom recipe.
---

# Health Hub → dashboard idiom

The Health Hub landing + its sub-app sections all live inline in the giant
`CustomerPortal.tsx` (section === "health-hub" | "compounds" | "health" |
"glp1"; blood-tests & plotter delegate to their own components).

**The applied idiom (reuse for any customer section):**
- Section landing gets a `HERO_GRAD` band: rounded-lg, `padding:"18-20px"`,
  white text, a `rgba(255,255,255,0.14)` icon chip, title (~18px font-extrabold
  -0.01em) + 80%-white subtitle.
- Action buttons ON the hero are white-fill / `color: ACCENT`, `rounded-md`,
  `padding:"8px 14px"` (NOT `var(--t-blue)` filled).
- Summary tiles use the exported `StatCard` with `T={palette(dark)}` (dark from
  `useThemeStore`) — grid-cols-3, SHORT labels.
- Grouped nav cards use `SecIcon` section headers + `palette(dark)` cardStyle
  (rounded-lg + layered shadow only when panel is #FFFFFF).

**Imports needed** (all from `@/components/DashboardShell`): `StatCard, palette,
ACCENT, ACCENT_SOFT, SecIcon, HERO_GRAD`. `DashboardShell` also exports a ready
`HEALTH_APPS` list. `Droplet` (lucide) is the blood-test icon.

**Gotcha:** the dev/vite server does NOT hard-fail on an unresolved imported
symbol at startup — a missing `HERO_GRAD`/`SecIcon` import only crashes the
section at render (behind login, so easy to miss). After adding new imported
symbols to CustomerPortal, verify the import line actually contains them
(`grep` it) — an import edit here silently reverted once. Confirm before trusting.
