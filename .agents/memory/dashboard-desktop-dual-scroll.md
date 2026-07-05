---
name: DashboardHome desktop dual-pane scroll
description: Why the customer dashboard main content must own its scroll on desktop (lg-gated), and the mobile header overflow fix.
---

# DashboardHome desktop scroll (DashboardHome.tsx)

## The rule
On desktop (`lg:`), the customer dashboard uses a **dual-pane** layout: a
`position:fixed` left sidebar (with its own inner `overflow-y-auto`) and a main
content column that is its **own** scroll container. Never let the desktop main
content rely on document/body scroll.

Implementation (all `lg:`-gated so mobile is untouched):
- Root flex wrapper: `lg:h-screen lg:overflow-hidden`.
- Main content column: a plain **block** scroller `lg:h-screen lg:overflow-y-auto
  lg:overflow-x-hidden` (keep `flex-1 min-w-0`). Do **not** make it
  `flex flex-col` — a flex-column parent with a fixed height shrinks its child
  instead of scrolling (flex-shrink gotcha). It has a single child so block is
  layout-neutral.

**Why:** with a fixed sidebar + body scroll, the sidebar's inner
`overflow-y-auto` captures the wheel over the nav while the main content fails to
scroll — desktop-only ("scrolls over nav, not over main content"), mobile fine.
Root cause was never a single JS/CSS trap (no wheel handlers, no global overflow
cap, clean drawer store, HubBottomNav body-lock self-heals on desktop); it was
the fragile body-scroll coupling. The dual-pane pattern removes the whole class.

**How to apply:** any change to the dashboard shell height/overflow must stay
`lg:`-gated. Mobile MUST keep natural body scroll — never add `h-screen`/
`overflow` without an `lg:` prefix (see mobile-drawer-body-lock.md for the
inverse hazard). Because `overflow-y:auto` flips computed `overflow-x` to `auto`,
always pair it with `lg:overflow-x-hidden` or a stray horizontal scrollbar
appears (html/body `overflow-x:hidden` does NOT mask an inner scroller).

## Mobile header overflow (profile avatar clipped)
The top-bar right cluster (credits + theme + bell + profile) is `shrink-0` and
overflowed the mobile viewport, clipping the last item (profile avatar) since
body has `overflow-x:hidden`. The dominant hidden driver was the empty center
search wrapper's fixed `px-2` (16px dead padding on mobile — search is
`hidden sm:block`). Fixes: center wrapper `px-2` → `sm:px-2`; theme toggle
`hidden md:flex` (theme also lives in the HubBottomNav mobile drawer); profile
chevron `hidden md:block`; header padding `px-3 md:px-7`. This fits ≥360px; for
≤360px the remaining lever is compacting the credits pill to icon-only.
