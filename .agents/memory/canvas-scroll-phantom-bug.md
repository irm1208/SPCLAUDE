---
name: Canvas/preview scroll phantom bug
description: "Won't scroll" where scrollbar-drag works but trackpad/wheel doesn't = Replit board capturing wheel, not an app bug.
---

# "Dashboard won't scroll" is usually the canvas, not the app

**Symptom that identifies it:** dragging the scrollbar DOES scroll, but two-finger
trackpad / mouse-wheel swipe does NOT. Often paired with "no left sidebar" in a
screenshot (the tile renders the app at a narrower width than a real window).

**Strongest fingerprint:** an INNER scroll container (e.g. the sidebar nav's
`overflow-y-auto dh-scroll`) DOES scroll with the trackpad inside the board, and
once it bottoms out the scroll "spills"/chains into the page — but scrolling over
the main body-scroll area does nothing. That's because the board captures wheel at
the document level to pan itself, while an inner scroll container consumes the
wheel first. This proves it's the board, not the app.

**Do NOT "fix" it by converting the app/dashboard to inner-scroll** (`h-screen` +
`overflow-y-auto`): it would make the trackpad work in the board but degrades the
real mobile experience (100vh vs dynamic viewport, browser chrome no longer hides
on scroll, fixed bottom-nav overlap). The board is a dev/preview surface; don't
trade real-customer mobile UX for it.

**Cause:** when the app is viewed inside a Replit board/canvas iframe tile (or an
embedded preview), the parent canvas captures wheel/trackpad gestures to pan the
board, so they never reach the page inside the tile. A scrollbar drag is a direct
pointer interaction on the app itself, so it still works.

**Why it's not an app bug:** the peps-anonymous frontend uses natural body scroll —
DashboardHome root is `flex w-full min-h-screen` (grows with content, no vertical
clip), `html`/`body`/`#root` have no `overflow-y:hidden` and no fixed height, the
App shell (ErrorBoundary → providers → Router) adds no wrapping div, and there is
**no** `wheel`/`touchmove`/`onWheel` `preventDefault` anywhere in `src`. The page
scrolls at every width and in a real browser tab.

**Fix for the user:** open the app in its own browser tab (the "Open in new tab" ↗
on the preview tile). Do NOT try to fix this in code.

**Dead ends already ruled out (don't re-try):** body-scroll-lock in HubBottomNav
(only locks the mobile drawer <768px and the QuickViews aren't on the dashboard);
global CSS; layout height/overflow clip in DashboardHome; scroll-hijacking JS.
