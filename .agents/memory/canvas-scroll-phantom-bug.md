---
name: Canvas/preview scroll phantom bug + real sidebar scroll-trap
description: Separate two scroll complaints — Replit board wheel-capture (not an app bug) vs a REAL fixed-sidebar inner-overflow trap that reproduces in a real tab.
---

# Dashboard "scroll" complaints are TWO different things

There are two distinct causes that get reported together. Diagnose which one before touching code.

## 1. Board/canvas wheel-capture — NOT an app bug

**Symptoms:** scroll is choppy/slow; two-finger trackpad / mouse-wheel swipe does
nothing while dragging the scrollbar DOES scroll; often paired with "no left sidebar"
(the tile renders the app narrower than a real window).

**Cause:** viewed inside a Replit board/canvas iframe tile, the parent canvas captures
wheel/trackpad gestures to pan the board and re-composites the big live tile every
frame (hence choppy). A scrollbar drag is a direct pointer interaction so it still works.

**Fix for the user:** open the app in its own browser tab (the ↗ "Open in new tab" on
the preview). Do NOT fix this in code — it's a preview-surface artifact. Confirmed with
the user that it's smooth in a real tab.

## 2. Fixed-sidebar inner-overflow trap — a REAL app bug (reproduces in a real tab)

**Do not mistake this for #1.** Fingerprint: scrolling while the cursor is over the
LEFT SIDEBAR scrolls the sidebar nav to its bottom FIRST, then the page scrolls. This
happens in a real browser tab too. The canvas wheel-capture can sit on top and make it
look like #1, but the trap itself is real.

**Cause:** the desktop sidebar (`<aside>` `fixed inset-y-0`, 100vh, DashboardHome.tsx)
has an inner `overflow-y-auto dh-scroll` region holding brand + nav + Compounds + Group
Buys + Telegram promo. That stack is ~860–880px; on typical laptop viewport heights
(1366×768≈660, 1440×900≈790, 1536×864≈750) it overflows and becomes an independent
scroll container that eats the wheel until it bottoms out. A persistent full-height
sidebar with overflowing content MUST either scroll internally (this trap) or clip —
there is no pure-CSS "scroll the page while cursor is over an overflowing scroll box".

**Fix applied (architect-approved Option B):** keep everything structural (fixed aside,
icon-rail `marginTop:auto` footer, main `lg:ml-[var(--dh-ml)]`, and `overflow-y-auto`
as a last-resort fallback). Add `min-width:1024px` + `max-height` media queries that
drop the lowest-priority sidebar sections as the viewport shortens so the nav fits and
never scrolls internally (promo ≤960px, Group Buys ≤720px, Compounds ≤560px) via hook
classes `dh-side-promo` / `dh-side-gb` / `dh-side-compounds`.

**Gotcha that blocked the first pass:** anything you hide this way must not be its only
entry point. Telegram's `onSection("telegram")` existed ONLY in the promo card on
desktop — the `{ id: "telegram" }` portal nav item is consumed solely by HubBottomNav,
which is `md:hidden` (mobile only). Hiding the promo orphaned Telegram on desktop until
a Send-icon Telegram button was added to the icon-rail footer (zero vertical budget,
always visible). Group Buys (main nav) and Compounds (Health Hub / "View compounds")
were already safe.

## Shared dead end — don't re-try

**Do NOT "fix" either by converting the app/dashboard to a global inner-scroll shell**
(`h-screen` + `overflow-y-auto`): it would make the trackpad work in the board but
degrades real mobile UX (100vh vs dynamic viewport, browser chrome no longer hides on
scroll, fixed bottom-nav overlap). The rest of the app uses natural body scroll on
purpose. Also ruled out: `overscroll-behavior:contain` (fully traps, worse); a sticky
in-flow sidebar (taller-than-viewport sticky pins at top and its bottom items become
unreachable without JS); JS wheel-forwarding (breaks keyboard/touch consistency).
