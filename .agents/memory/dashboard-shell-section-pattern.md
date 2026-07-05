---
name: Dashboard shell section pattern
description: How CustomerPortal sections adopt the reusable dashboard shell (nav + chrome) and why theming needs no conversion.
---

# Reusable dashboard shell for CustomerPortal sections

The customer portal is migrating each `section` (orders first; groups/health/lab-tests
to follow) from the old `PortalLayout` + gradient-hero header to a shared
`DashboardShell` (sidebar rail + flyouts + topbar + ⌘K search + HubBottomNav).

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
