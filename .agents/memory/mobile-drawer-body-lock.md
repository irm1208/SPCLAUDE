---
name: Mobile drawer body-lock breaks desktop scroll
description: Why a global drawer's body-overflow lock can freeze desktop scrolling, and the zustand updater-function gotcha behind it.
---

# Mobile drawer body-lock breaks desktop scroll

**Symptom:** "Scroll is not working on the dashboard" at desktop width. The page cannot scroll even though the content overflows.

**Rule 1 — viewport-scope any `document.body.style.overflow` lock to match the drawer's responsive visibility.**
A bottom-nav / hamburger drawer whose UI is `md:hidden` (mobile-only) but whose body-lock effect runs on *all* viewports will strand `body { overflow: hidden }` on desktop: the mobile close affordances (X / backdrop) aren't rendered ≥768px, so there is no way to unlock. Fix: make the lock effect `matchMedia('(min-width:768px)')`-aware — on desktop never lock (`overflow=""`) and auto-close any stale open state; on mobile lock only when open; listen to the mq `change` event so a mobile→desktop resize unlocks; cleanup removes the listener and resets overflow.

**Why:** the drawer open flag is a *global* store (zustand `useHubDrawerStore`, no persistence) shared across breakpoints. Open it on mobile, widen the viewport, and the lock survives with no UI to clear it.

**Rule 2 — zustand setters take a VALUE, not an updater function.**
`setOpen` defined as `(v) => set({ open: v })` does NOT evaluate updater functions. Calling `setOpen(o => !o)` stores the *function object* into `open`, which is permanently truthy — the drawer can never toggle closed via that button, and the truthy `open` is what triggers the body-lock in the first place. Always pass a real boolean: `setOpen(!open)`. This was the actual root trigger of the desktop scroll lockout; the viewport-scoped effect is the defensive backstop.

**How to apply:** whenever a component writes `document.body.style.overflow` for a modal/drawer/sheet, confirm (a) the lock is scoped to the breakpoint where the overlay actually renders, and (b) every setter call passes a value, not `prev => ...`, unless the store explicitly supports functional updates.
