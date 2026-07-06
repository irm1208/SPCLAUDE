---
name: Dashboard-aligning pages already on var(--t-*) tokens
description: How to restyle a customer page to the dashboard "Lightning" look when it already uses var(--t-*) color tokens, without touching colors.
---

# Dashboard-aligning a page that already uses var(--t-*) tokens

When a page complains of "old style" but already renders with `var(--t-surface)/--t-border/--t-text/--t-muted/--t-subtle/--t-blue`, do NOT add the `palette(isDark)`/`T`/`cardStyle` theme hook or convert colors to `palette()`/`color-mix`.

**Why:** those CSS vars already track light/dark automatically, and `var(--t-blue)` (#2D6BCC) is itself a dashboard accent color — so the colors are already "on theme." The real visual mismatch vs the DashboardShell/DashboardHome look is only three things:
1. Header — plain `<h1>` needs a `HERO_GRAD` navy gradient hero band (use exported `STATUS_STYLE[order.status]` for the status pill/dot + a fulfilment progress bar from `.pct`, hidden when Cancelled).
2. Card radius — `rounded-2xl` (16px) → `rounded-lg` (8px), matching dashboard `cardStyle`.
3. Section titles — plain `<h2 class="text-sm font-bold">` → `SecIcon` (exported from DashboardShell) + `font-extrabold` span (~15px, -0.01em).

**How to apply:** import only `SecIcon, STATUS_STYLE, HERO_GRAD` from `@/components/DashboardShell` (SecIcon internalizes ACCENT/ACCENT_SOFT). Keep every `var(--t-*)`. This keeps the edit surface tiny and avoids stretching/gutting downstream functional sections. Identical card-container strings repeat, so change radius via `replace_all` on the exact container string; cards with an extra class (e.g. `space-y-2.5`) won't match — edit those separately. Pre-existing strict-tsc errors in these big pages are expected (build is decoupled from typecheck); confirm any tsc error also exists in `git show HEAD:<file>` before treating it as your regression.
