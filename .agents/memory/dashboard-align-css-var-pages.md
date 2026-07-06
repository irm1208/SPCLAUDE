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

## "Still looks like AI" follow-up on these pages
When the header/cards/section-titles are already dashboard-aligned but the user still says it "looks like AI", the remaining tells are almost always these three — fix them, don't re-theme:
1. **Emojis.** The dashboard uses lucide icons ONLY. Sweep 📦🏠🌐📢 etc. and swap to lucide (Truck/Home/ExternalLink/Megaphone/Info). Leave functional emoji DATA (e.g. phone-prefix country flags) alone.
2. **Primary buttons.** Generic `h-12 rounded-xl font-bold` filled buttons read as AI. Dashboard buttons are `rounded-md`, `font-semibold`, `padding:"10px 16px"` (no fixed height), filled with `ACCENT` (#0176D3, re-exported from DashboardShell) — NOT `var(--t-blue)` (#2D6BCC). Unify all CTAs on ACCENT; it also matches the SecIcon chips which already use ACCENT.
3. **Decorative per-item icon tiles** (e.g. a blue Package square on every line item) look generated — remove them; keep the text row.
4. **Mixed card styles.** The strongest tell after 1–3: the page mixes the dashboard cardStyle (`rounded-lg` + `boxShadow:"0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"`) with (a) bubbly `rounded-2xl` banners, (b) shadcn `<Card>` (default `rounded-xl` + heavy `shadow`), and (c) pastel-FILLED accent cards (e.g. `bg-violet-50/40`, `bg-blue-50/60`). Unify ALL of them: `replace_all rounded-2xl→rounded-lg`; append `rounded-lg shadow-none` to every `<Card>` (cn=twMerge so it overrides the component defaults — note Card comes from `@/components/ui`, not `ui/card.tsx`, but both are equivalent); replace pastel card fills with a clean `var(--t-surface)` card + the layered shadow, moving the accent color to a small `rounded-lg` icon chip only (matches SecIcon). Placeholder/locked cards can stay flat (surface2, `shadow-none`, no boxShadow). **De-pastel trap:** a pastel-filled card whose inner text is hardcoded `text-*-800`/`dark:*` relied on the always-light fill for contrast; once the fill becomes `var(--t-surface)`, neutralize that on-surface text to `var(--t-text)`/`var(--t-muted)` (or `light-dark()`) or it breaks when the app toggles dark on an OS-light machine — see dashboard-theme-toggle-vs-tailwind-dark.md.

Header size is 16px (not 15). "Position buttons properly" on the order-detail two-column grid = move the Download-PDF + Edit/Top-up block out of the bottom of the tall sidebar (where it's buried under QR cards) into an "Actions" card at the TOP of the sidebar; move the whole conditional block verbatim to preserve gating, keep the destructive Cancel/Delete block separate at the bottom.

**Do NOT delegate these pages to the DESIGN subagent** — they're huge and functionally dense; the subagent guts handlers/deep-links (see design-subagent-functional-regressions). Apply the dashboard idiom by hand.
