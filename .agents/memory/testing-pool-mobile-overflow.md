---
name: Testing pool pages mobile overflow
description: Why content gets "cut off" (not scrollable) on mobile in TestingPool/GbTestingPool, and the breakpoint to use for column stacking.
---

# Testing pool pages — mobile overflow gotcha

Pages: `TestingPool.tsx` (`/pool/:slug`) and `GbTestingPool.tsx` (`/testing/:gbId`).

## Rule
- The page content wrapper uses `overflow-x-hidden`, which **clips** horizontal
  overflow rather than making it scrollable. So any element wider than the
  viewport is silently **cut off**, not reachable by scroll.
- Use `lg:grid-cols-2` (NOT `md:grid-cols-2`) for the two-column Pool Progress /
  Standings layout. This gives single-column stacking on all phones AND tablets
  (<1024px), with Pool Progress first in DOM order. `md:` regresses tablet/mobile.

**Why:** A user reported "half the information is cut off on mobile." Root cause
was the milestone legend: GB milestone labels include the full compound blend
(e.g. "Mass/Purity · BPC 5mg / TB4 5mg Blend · $450"). A centered `flex-wrap`
legend row let that long single item exceed the card width and get clipped by
the wrapper's `overflow-x-hidden`.

**How to apply:** Any data-driven, potentially-long text in these pages (legend
labels, test chip names, payment references, vote rows) needs `min-w-0` on the
flex item + `break-words` on the text span, or stack items vertically on mobile
(`flex-col` then `sm:flex-row sm:flex-wrap`). When debugging "cut off on mobile"
reports here, suspect a long unbroken string overflowing under overflow-x-hidden
before suspecting the grid.

## Milestone/step cards: grid, not horizontal scroll
- GbTestingPool's milestone cards were a `flex overflow-x-auto` row with
  `flex-1 min-w-[155px]` cards + `scroll-snap x mandatory`. On a phone only 2-3 of
  4 step cards fit; the rest sit off-screen and users don't realize they can scroll
  sideways → repeated "half the information is cut off" reports even after the
  legend/grid fixes.
- Fix: render step cards in a wrapping grid (`grid grid-cols-2 lg:grid-cols-4`) and
  drop `flex-1`/`min-w`/scroll-snap on the card. All cards visible on mobile (2×2),
  unchanged 4-in-a-row on desktop. Handles any milestone count via wrapping.

**Why:** Horizontal-scroll rows are a recurring "cut off on mobile" complaint
source on these pages. Prefer a responsive grid for any fixed-small set of cards.
TestingPool still uses horizontal scroll for its steps; this is a deliberate
divergence toward better mobile UX, not a mismatch to "fix."

## HMR caveat
The screenshot tool loads `localhost:5000` directly, so Vite HMR shows
`wss://localhost` failures there regardless — that's expected and not the bug.
The dev server picks up file changes server-side; a fresh full load (screenshot
tool or user hard-refresh) reflects current code even when HMR can't push.
