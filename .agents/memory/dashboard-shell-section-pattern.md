---
name: Dashboard shell section pattern
description: How CustomerPortal sections adopt the reusable dashboard shell (nav + chrome) and why theming needs no conversion.
---

# Reusable dashboard shell for CustomerPortal sections

ALL CustomerPortal sections now render inside the shared `DashboardShell`
(sidebar rail + flyouts + topbar + ⌘K search + HubBottomNav). The old
`PortalLayout`/`PageTitle` wrappers are deleted; new sections must use the
`inShell(id, title, node, opts?)` helper (a plain function, NOT a nested
component — nesting would remount children every render).

**How to migrate a section:**
- Wrap the section's returned JSX in `<DashboardShell activeSection="<section>" title="..." ...navProps />`.
- Put content in the shell's convention container: `<div className="px-4 md:px-7 py-6 flex flex-col gap-5 pb-24 lg:pb-8">`; the shell renders `{children}` in the main scroll area.
- Shell chrome + dashboard tiles (`StatCard`) are styled with `palette(dark)` where `dark = useThemeStore(s => s.dark)`.
- Existing card content (e.g. `OrderCard`) styled with the static `T` object is reused **untouched** — no theme conversion.

**Why no conversion is needed (the key fact):**
`useThemeStore` sets the `[data-theme]` attribute on the document root. That ONE
attribute drives BOTH: (a) the `--t-*` CSS variables behind the static `T` object,
and (b) the `dark` boolean consumed by `palette(dark)`. So chrome and content always
track a single dark-mode flag. Do not try to thread `dark` into `T`-based content.

**Gotchas:**
- `StatCard` label sits beside a 28px icon; in a full-width `grid-cols-3` (mobile) the
  cards are ~106px wide, so use SHORT labels ("Total"/"Active"/"Done"), not long ones
  ("Total Orders"/"Completed") — long labels wrap and clip the value. The home uses a
  2-col grid so its longer labels fit; the portal sections are 3-col.
- The removed back button is covered by the sidebar (desktop) + HubBottomNav (mobile).
- 3 pre-existing ambient `queryKey` codegen type-errors on the shell's search hooks are
  copied verbatim from the original; build is decoupled from typecheck so they don't block.
- User once reverted an OrderForm redesign — keep migrations byte-faithful on content.
- Full-bleed heroes/bands inside shell content must negate the shell container's
  padding EXACTLY: `-mx-4 md:-mx-7` (container is `px-4 md:px-7`). The old
  `-mx-5 lg:-mx-8` values were for PortalLayout padding and cause a 4px horizontal
  overshoot → mobile horizontal scroll (shell only sets overflow-x-hidden at lg).
- A section with its OWN mobile bottom bar (e.g. GLP-1's iOS tab bar) must pass
  `{ hideHubNav: true }` to inShell (→ DashboardShell `hideHubNav` prop) or the
  shell's HubBottomNav overlaps it below lg.
- Don't double bottom padding: the inShell container already has
  `pb-[calc(96px_+_env(safe-area-inset-bottom))] lg:pb-8`; inner content divs
  should not repeat it.

**Standalone detail pages adopting the shell (WholesaleShell pattern):**
Pages outside CustomerPortal (e.g. wholesale, order detail) wrap in a thin
top-level shell component mirroring `WholesaleShell.tsx` and swap chrome via
`useDashChrome = !isAdminPreview && (isLoggedIn || accountLoading)` →
shell, else `PageLayout`. Include `accountLoading` in the gate or logged-in
users get a PageLayout flash on first paint. Admin preview (`?adminPreview=1`)
MUST stay on PageLayout (no customer session). Gate any page-level
HubBottomNav with `!useDashChrome` (shell renders its own) and pair padding
to the shell's breakpoint (`pb-24 lg:pb-6`, hub nav hides at lg).

**Fixed bottom bars under DashboardShell (--dh-ml contract):**
A page's `position:fixed` bottom bar (e.g. order form Grand Total/Review)
must offset `left` by the shell sidebar width at lg+. DashboardShell sets
`--dh-ml` (collapse-aware sidebar width px) inline on the content wrapper;
it cascades to children, so use `left: isLgPlus ? "var(--dh-ml, 0px)" : 0`
(matchMedia 1024px = Tailwind lg; shell sidebar is hidden below lg even
though the var is still set). The bar's hub-nav clearance padding (76px)
must also key off lg under the shell, not md. PageLayout pages instead use
`isMdPlus ? (sidebarExpanded ? 240 : 56) : 0`.
If a 4th page copies the shell wrapper (OrderDetailShell/OrderFormShell/
WholesaleShell), extract a shared CustomerShell.
