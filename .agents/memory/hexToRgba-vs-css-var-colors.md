---
name: hexToRgba vs CSS-variable colors
description: Why hexToRgba silently breaks on STATUS_META/PAYMENT_META colors and what to use instead for tints
---

Rule: in CustomerPortal.tsx, `STATUS_META` and `PAYMENT_META` store `color` as **CSS variables** for the common active states (Submitted/Processing/Shipped, Pending/Test OK all use `var(--t-blue)`), not hex. Passing those to `hexToRgba(color, alpha)` returns `rgba(NaN, NaN, NaN, alpha)`, which browsers treat as invalid and drop — so tinted pill backgrounds/borders vanish with no error.

**Use instead** for any tint whose source color might be a CSS variable:
`background: color-mix(in srgb, ${color} 10%, transparent)` (and the same for borders). `color-mix` is valid whether the input is `#RRGGBB` or `var(--…)`.

`hexToRgba` is only safe for values guaranteed to be hex — e.g. the `accent` constants (`gbAccentColor()`, `WHOLESALE_ACCENT`, `SHOP_ACCENT`). Never feed it a `*Meta.color`.

**Why:** a mockup built with raw-hex STATUS_META hides this bug; it only appears after graduation into the real app whose theme meta uses CSS vars. Caught only in code review, not typecheck (it's a runtime CSS-value issue).

**How to apply:** whenever building status/payment/badge tints from a shared meta map, assume the color may be a CSS var and reach for `color-mix`, not `hexToRgba`.
