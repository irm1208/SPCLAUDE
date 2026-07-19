# SALT&PEPS Logo Design

## Purpose

Create a production identity for SALT&PEPS that feels evidence-led, clinically precise, and specific to peptides. The system replaces the generic `S&P` serif tile and must work across the website, favicons, social avatars, packaging, print, and one-color applications.

## Approved Direction

The identity is a combination mark: an original peptide-backbone symbol paired with the uppercase wordmark `SALT&PEPS`. The symbol also carries the visual rhythm of an ampersand so it connects the science to the name without relying on a stock molecule, DNA, flask, salt shaker, or pepper icon.

The icon is constructed on a 64-unit grid. A substantial folded backbone forms the primary silhouette. Two carbonyl double-bond cues and contrasting amide nodes make the peptide reference chemically grounded rather than decorative. The chain has intentional terminals and a crossing/loop relationship, but no atom labels or hairline detail that would fail at small sizes.

## Visual System

- Primary ink: `#0F1F38` for the wordmark.
- Backbone navy: `#1B3A7A` for the icon's main structure.
- Amide blue: `#2D6BCC` for selected peptide nodes and the wordmark ampersand.
- Reverse: white artwork on `#1B3164` or another sufficiently dark brand surface.
- Monochrome: one solid dark or light fill with no opacity, effects, or gradients.
- Typography: Inter 760-800 weight, outlined in exported SVGs so logo geometry does not depend on installed fonts.
- Letter spacing: optically tightened, with extra care around `LT`, `T&`, `&P`, and `PS`.

## Responsive Behavior

The full icon retains the backbone, amide nodes, and carbonyl cues at 24px and above. A small optical variant is used below 24px: it preserves the same silhouette while simplifying the smallest double-bond details and slightly enlarging the peptide nodes. The full horizontal logo has a minimum digital width of 120px; the icon-only mark has a minimum digital size of 16px for favicon use and 24px for interface use.

## Asset Family

Create the following under `artifacts/peps-anonymous/public/brand/`:

- `salt-peps-logo.svg`: primary horizontal full-color lockup.
- `salt-peps-logo-reverse.svg`: white horizontal lockup.
- `salt-peps-logo-mono.svg`: one-color horizontal lockup.
- `salt-peps-icon.svg`: primary icon-only mark.
- `salt-peps-icon-reverse.svg`: white icon-only mark.
- `salt-peps-icon-mono.svg`: one-color icon-only mark.
- `salt-peps-icon-small.svg`: optically simplified small-size icon.
- `salt-peps-social.svg`: icon on a deep-navy square with protected clear space.
- PNG exports at 16, 32, 48, 180, and 512 pixels where relevant.
- A favicon `.ico` when the deterministic export toolchain supports it without introducing a brittle dependency.

The existing `public/favicon.svg` becomes the small-size social-tile treatment so current browser references remain stable.

## Website Integration

Add a reusable `SaltPepsMark` React component that renders the canonical SVG geometry and supports primary and reverse color modes. Replace the current text-based `BrandMark` in `PageLayout.tsx` while retaining its 28px and 36px layout dimensions, rounded tile behavior where the navigation requires a contained mark, accessibility labeling, and dark/light theme compatibility.

No unrelated navigation, organiser, copy, or page styling changes are part of this work.

## Quality Bar

- Original geometry, not a copied or lightly modified library mark.
- Scientific reference limited to CC0 peptide-backbone diagrams; no attribution-dependent artwork is embedded.
- Recognizable silhouette at 16, 24, 32, 48, and 64 pixels.
- Clean in full color, reverse, and one color.
- No gradients, shadows, transparency, embedded fonts, external URLs, or raster data in master SVGs.
- Valid XML, preserved `viewBox`, deterministic output, and conservative SVG optimization.
- Wordmark remains legible on light and dark backgrounds and does not depend on website font loading.

## Verification

Generate a proof sheet showing horizontal, icon-only, monochrome, reverse, and small-size samples. Validate SVG/XML structure, palette usage, path bounds, and absence of forbidden effects. Build and typecheck the web application, then inspect the real site at desktop and mobile viewport sizes to confirm the new mark is crisp, correctly framed, and does not shift navigation layout.

