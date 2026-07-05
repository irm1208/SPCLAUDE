---
name: peps-brand
description: Peps Anonymous branding colors, typography, and design tokens. Use whenever applying styles, building UI components, or making visual decisions for the Peps Anonymous project. This is the single source of truth for the brand palette.
---

# Peps Anonymous Brand Guidelines

## Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Navy | `#1B3A7A` | Primary dark navy — page headers, active buttons, active step indicators |
| Brand Blue | `#2D6BCC` | Bright blue — interactive highlights, toggle-on, links, accent text |
| Deep Navy | `#1B3164` | Darkest navy — solid brand swatch, hero backgrounds, dark cards |

## Signature Gradient

The brand uses a navy-to-blue gradient for hero/header sections:

```css
background: linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%);
/* or as seen on customer portal: */
background: linear-gradient(135deg, #3B66C8 0%, #1B3A7A 100%);
```

Used on: customer portal headers (My Orders, Account pages), group buy cards, admin hero areas.

## Text Colors

| Context | Color |
|---------|-------|
| Primary heading (light bg) | `#0F1F38` |
| Body text (light bg) | `#374151` |
| Secondary/muted (light bg) | `#6B7280` |
| Label/hint (light bg) | `#8A9AAA` |
| Primary text (dark/navy bg) | `#FFFFFF` |
| Secondary text (dark/navy bg) | `rgba(255,255,255,0.75)` |
| Accent label (dark card) | `#E9A020` (amber) |

## Surfaces & Cards

| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#F8FAFC` | Light mode default page bg |
| Dark card | `#1C2B3D` | Product selectors, dark sections |
| Dark input | `#162231` | Inputs inside dark cards |
| Light card | `#FFFFFF` | Standard cards on light bg |

## Borders

| Variant | Value |
|---------|-------|
| Subtle (light bg) | `#D0DAE4` or `rgba(27,58,122,0.2)` |
| Active (blue) | `rgba(45,107,204,0.25)` |
| Dark card border | `rgba(255,255,255,0.08)` |

## Button Conventions

| Type | Style |
|------|-------|
| Primary CTA (Review, Submit, Save) | `background: #1B3A7A`, white text, `rounded-xl` |
| Secondary / ghost | dashed border `#D0DAE4`, text `#8A9AAA`, transparent bg |
| Toggle ON | `background: #2D6BCC` |
| Toggle OFF | `background: #D1D5DB` |
| Danger | `background: #ef4444` |

## Status / Accent Colors

| State | Color |
|-------|-------|
| Success / Confirmed | `#22c55e` / Tailwind `green-600` |
| Error / Cancelled | `#ef4444` / Tailwind `red-500` |
| Warning / Amber | `#E9A020` |
| Info | `#2D6BCC` |

## Typography

- Font family: `'Inter', sans-serif`
- Section labels: `text-[10px] font-bold uppercase tracking-widest` in Navy or `#8A9AAA`
- Card headings: `text-xl font-bold` in `#0F1F38`
- Step indicators: `text-[9px] font-bold` in white (active) or Navy (inactive)

## Dark Mode

Toggled via `document.documentElement.dataset.theme = "dark"`.
Uses CSS variable `--t-bg` and related tokens for background switching.

## Brand Name

Always written as **Peps Anonymous** — never abbreviated in UI copy.
