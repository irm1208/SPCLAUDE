---
name: Dashboard theme toggle vs Tailwind dark:
description: How light/dark theming actually works on peps-anonymous customer pages, and why to use CSS light-dark() (not Tailwind dark:) for accent colors on --t-* cards.
---

# Theme-safe accent colors on --t-* dashboard cards

The customer dashboard uses two INDEPENDENT theming mechanisms that do NOT track each other:

1. `--t-*` CSS-var tokens (`--t-surface/text/muted/subtle/border/blue…`) flip via a **manual** `data-theme` attribute on `<html>`, driven by `use-theme.ts` (zustand store, **default light, no OS linkage**). The dark block also sets `color-scheme: dark`.
2. Tailwind v4 `dark:` variants: there is **NO `@custom-variant dark` and no `darkMode` config**, so `dark:` keys off the OS `prefers-color-scheme` media query — completely decoupled from the app toggle. Existing `dark:` usages on customer pages are effectively OS-driven and can mismatch the toggle-driven card surface. Treat them as a pre-existing quirk, don't rely on them.

**Rule:** For accent colors sitting on a `--t-surface` card that must stay readable in BOTH toggle states, use CSS `light-dark(<lightValue>, <darkValue>)` — it resolves off `color-scheme`, which the app sets per `data-theme`, so it tracks the toggle. Do NOT reach for Tailwind `dark:` variants for this.

**Why:** Only `--t-blue` (+ its rgba variants) and the neutral `--t-text/muted/subtle/border/surface` tokens flip via tokens. There are NO semantic green/red/violet/emerald/indigo tokens, so colored semantic accents can't be expressed as a single flipping var. `light-dark()` lets you keep a light-optimized value AND the original dark value in one declaration.

**How to apply:**
- Wrap semantic hexes: e.g. `color: "light-dark(#475569, #94a3b8)"` (slate), `light-dark(#6d28d9, #c4b5fd)` (violet), `light-dark(#4f46e5, #a5b4fc)` (indigo), `light-dark(#dc2626, #fca5a5)` (red), `light-dark(#059669, #6ee7b7)` (emerald), `light-dark(#16a34a, #22c55e)` (green).
- When converting a formerly-navy card that had light text designed for dark bg, the OLD colors become the `dark` branch of `light-dark()` — restores the exact prior dark-mode look for free.
- **Graceful fallback:** if a browser lacks `light-dark()`, the whole `color` value is dropped and text inherits the nearest ancestor's `color`. So set `color: var(--t-text)` on the card container as a safety net.
- Neutral (non-semantic) accents like a muted "batch locked" note can just use `var(--t-subtle)`/`var(--t-muted)` instead of `light-dark()`.

**Scoped-theme class + portals/fixed modals gotcha:** when a page opts into a design variant via a scoped class on its root wrapper (e.g. `.warm-order` overriding `--t-*` tokens), any `fixed`/portaled modal rendered as a SIBLING outside that wrapper (common with `AnimatePresence` confirm dialogs placed after the main `</div>`) will resolve `--t-*` to the DEFAULT palette, not the variant. Fix by adding the scoped class directly to the modal's own `fixed` element. `color-scheme` still inherits from `<html>`, so `light-dark()` keeps tracking the toggle regardless of where the element sits.
