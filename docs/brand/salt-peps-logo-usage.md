# SALT&PEPS Logo Usage

## Identity

The SALT&PEPS mark is a peptide-bond ampersand. Its broad folded backbone forms the core silhouette; two repeated carbonyl cues and oxygen lozenges connect the symbol to the repeating `N-Ca-C(=O)` grammar of a peptide chain. It is an intentional brand abstraction, not a publication-grade chemical structure or a claim about a specific therapeutic peptide.

The primary wordmark is always `SALT&PEPS` in uppercase with no spaces. Product copy may continue to use the readable name `Salt & Peps`.

## Production Assets

All assets live in `artifacts/peps-anonymous/public/brand/`.

| Asset                        | Use                                                             |
| ---------------------------- | --------------------------------------------------------------- |
| `salt-peps-logo.svg`         | Primary horizontal logo on white or light surfaces              |
| `salt-peps-logo-reverse.svg` | Horizontal logo on deep navy or dark surfaces                   |
| `salt-peps-logo-mono.svg`    | One-color print, engraving, stamps, and restricted-color output |
| `salt-peps-icon.svg`         | Primary standalone mark at 24px and larger                      |
| `salt-peps-icon-small.svg`   | Optically simplified mark below 24px                            |
| `salt-peps-icon-reverse.svg` | Standalone mark on dark surfaces                                |
| `salt-peps-icon-mono.svg`    | One-color standalone mark                                       |
| `salt-peps-social.svg`       | Scalable square avatar with protected clearspace                |
| `salt-peps-icon-16.png`      | 16px bitmap fallback                                            |
| `salt-peps-icon-32.png`      | 32px bitmap fallback                                            |
| `salt-peps-icon-48.png`      | 48px bitmap fallback                                            |
| `salt-peps-social-180.png`   | Apple touch icon and small profile image                        |
| `salt-peps-social-512.png`   | High-resolution social/profile image                            |
| `salt-peps-logo-1440.png`    | Transparent high-resolution horizontal fallback                 |
| `salt-peps-logo-proof.svg`   | Light, dark, monochrome, and responsive-size proof sheet        |

Use SVG whenever the destination supports it. PNG files are fallbacks for platforms that require raster uploads.

## Color

| Element                            | Color                |
| ---------------------------------- | -------------------- |
| Wordmark                           | Ink `#0F1F38`        |
| Peptide backbone                   | Navy `#1B3A7A`       |
| Oxygen cues and wordmark ampersand | Brand Blue `#2D6BCC` |
| Social tile                        | Deep Navy `#1B3164`  |
| Reverse artwork                    | White `#FFFFFF`      |

Do not add gradients, shadows, transparency, outlines, or colors outside the approved variants.

## Clearspace And Size

Let `x` equal one oxygen-lozenge diameter, approximately one eighth of the icon height. Keep at least `x` of empty space around every side of the standalone mark or horizontal lockup.

- Minimum full-logo width: 120px digital or 35mm print.
- Minimum UI icon: 24px. Use `salt-peps-icon.svg`.
- Minimum favicon icon: 16px. Use `salt-peps-icon-small.svg` or the supplied 16px PNG.
- Minimum print icon: 10mm.
- Social avatars must use the supplied social tile rather than placing the bare mark against an arbitrary background.

## Backgrounds

- Use the primary logo on white, `#F8FAFC`, or another quiet light surface.
- Use the reverse logo on `#1B3164`, `#1B3A7A`, or a sufficiently dark solid surface.
- Use monochrome artwork when the reproduction process permits only one ink.
- Do not place the logo directly over detailed photography or low-contrast color fields.

## Do Not

- Stretch, compress, rotate, crop, or rearrange the logo.
- Redraw the carbonyl bonds, remove one oxygen cue, or add atom labels.
- Replace the outlined wordmark with live text or another font.
- Separate the wordmark ampersand from its approved spacing.
- Put the mark in an unapproved decorative container.
- Use a library molecule, DNA helix, flask, salt shaker, or pepper icon as a substitute.

## Source And Regeneration

The master geometry is original and generated locally with Maker.js, OpenType.js, SVGO, and resvg. Inter 800 is outlined into the final wordmark; its SIL Open Font License is stored at `scripts/logo/OFL.txt`. No generative image API is used, and no third-party scientific artwork is embedded in the mark.

```bash
node scripts/generate-salt-peps-logo.mjs
node scripts/verify-salt-peps-logo.mjs
node scripts/verify-salt-peps-raster.mjs
node scripts/verify-salt-peps-integration.mjs
```
