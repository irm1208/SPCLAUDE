# Salt&Peps Logo Usage

## Identity

The primary logo is the type-derived title-case wordmark `Salt&Peps`. It is a heavy geometric sans construction with no separate icon, badge, or scientific illustration. The ampersand is the only color accent in the primary version.

The wordmark is always `Salt&Peps` with no spaces. Product copy may use the same spelling when the brand name appears in running text.

## Production Assets

Wordmark and device assets live in `artifacts/peps-anonymous/public/brand/`; the browser favicon is served from `artifacts/peps-anonymous/public/favicon.svg`.

| Asset                              | Use                                                             |
| ---------------------------------- | --------------------------------------------------------------- |
| `salt-peps-logo.svg`               | Primary horizontal wordmark on white or light surfaces          |
| `salt-peps-logo-reverse.svg`       | White horizontal wordmark on deep navy or dark surfaces         |
| `salt-peps-logo-mono.svg`          | One-color print, engraving, stamps, and restricted-color output |
| `salt-peps-logo-1440.png`          | Transparent high-resolution horizontal fallback                 |
| `salt-peps-logo-proof.svg`         | Light, dark, monochrome, and size proof sheet                  |
| `/favicon.svg`                     | Approved deep-navy `S&P` favicon for browser and website UI icon surfaces |
| `salt-peps-apple-touch-180.png`    | Opaque `S&P` Apple touch icon                                   |
| `salt-peps-icon*.svg`              | Existing standalone icon family; separate symbol review scope  |
| `salt-peps-social*.png/svg`        | Existing square profile assets; separate symbol review scope   |

Use SVG whenever the destination supports it. PNG files are fallbacks for platforms that require raster uploads.

## Color

| Element                            | Color                |
| ---------------------------------- | -------------------- |
| Wordmark letters                   | Ink `#0F1F38`        |
| Primary wordmark ampersand         | Brand Blue `#2D6BCC` |
| Favicon background                 | Deep Navy `#1B3164`  |
| Favicon and reverse artwork        | White `#FFFFFF`      |

Do not add gradients, shadows, transparency, outlines, or colors outside the approved variants.

## Clearspace And Size

Let `x` equal 8 logo units in the `360x80` viewBox. Keep at least `x` of empty space around every side of the horizontal wordmark.

- Minimum full-logo width: 120px digital or 35mm print.
- Use the approved `/favicon.svg` asset for square browser and website UI icon contexts.
- Existing standalone icon and social assets remain available for non-website legacy exports and separate symbol review.
- Apple touch icons must use the opaque `salt-peps-apple-touch-180.png`.

## Backgrounds

- Use the primary logo on white, `#F8FAFC`, or another quiet light surface.
- Use the reverse logo on `#1B3164`, `#1B3A7A`, or a sufficiently dark solid surface.
- Use monochrome artwork when the reproduction process permits only one ink.
- Do not place the logo directly over detailed photography or low-contrast color fields.

## Do Not

- Stretch, compress, rotate, crop, or rearrange the logo.
- Add an icon, badge, molecule, DNA helix, flask, salt shaker, or pepper illustration to the horizontal wordmark.
- Replace the outlined wordmark with live text or another font.
- Separate the wordmark ampersand from its approved spacing.
- Put the wordmark in an unapproved decorative container.
- Recolor the ampersand outside the approved primary, reverse, or mono variants.

## Source And Regeneration

The wordmark geometry is generated locally with OpenType.js, SVGO, and resvg. Inter 800 is outlined into the final wordmark; its SIL Open Font License is stored at `scripts/logo/OFL.txt`. No live font, generative image API, or third-party artwork is embedded in the production wordmark.

```bash
pnpm logo:generate
pnpm logo:verify
```
