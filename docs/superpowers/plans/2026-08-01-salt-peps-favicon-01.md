# Salt&Peps Favicon 01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote the approved 01 Type-derived `S&P` monogram into the production browser favicon with a Brand Blue background and white lettering.

**Architecture:** A deterministic Node generator will outline the existing Inter ExtraBold glyphs into a fixed SVG, apply a centered square fit transform, and write the stable `public/favicon.svg` plus the opaque Apple touch PNG. The integration verifier will assert the new blue/white favicon contract while the existing in-app peptide mark and unrelated brand assets remain unchanged.

**Tech Stack:** Node.js, OpenType.js, SVGO, Prettier, `@resvg/resvg-js`, PNG contract checks.

---

### Task 1: Add the failing favicon contract

**Files:**
- Modify: `scripts/verify-salt-peps-integration.mjs`

- [x] **Step 1: Replace the old peptide favicon assertions with the approved 01 contract**

  Assert that `artifacts/peps-anonymous/public/favicon.svg` has a `0 0 180 180` viewBox, a `#1B3164` rounded-square background, the 01 type-derived path fragments, the `translate(9 24) scale(.70)` fit transform, at least three white filled glyph paths, and no old peptide path, text, font, external URL, raster, gradient, or filter. Keep the existing stable `/favicon.svg` reference assertion in `index.html`.

- [x] **Step 2: Run the integration verifier and confirm the expected failure**

  Run:

  ```bash
  node scripts/verify-salt-peps-integration.mjs
  ```

  Expected: FAIL because the current production favicon still contains the peptide paths and `#1B3164` background.

### Task 2: Generate the approved favicon assets

**Files:**
- Create: `scripts/generate-salt-peps-favicon.mjs`
- Modify: `package.json`
- Modify: `artifacts/peps-anonymous/public/favicon.svg`
- Modify: `artifacts/peps-anonymous/public/brand/salt-peps-apple-touch-180.png`

- [x] **Step 1: Add the deterministic generator**

  Read `scripts/logo/inter-latin-800-normal.woff` with OpenType.js, outline `S`, `&`, and `P` at size 116 on the same baseline used by the approved board, and emit their path data with two decimal places. Render a `180x180` SVG with a `30px` rounded `#1B3164` background and a centered `translate(9 24) scale(.70)` group whose three glyph paths are all `#FFFFFF`. Serialize the SVG without fonts, text, external references, gradients, filters, or raster data. Render the same SVG to the opaque `salt-peps-apple-touch-180.png` using `@resvg/resvg-js`.

- [x] **Step 2: Expose the generator through the package scripts**

  Add:

  ```json
  "favicon:generate": "node scripts/generate-salt-peps-favicon.mjs"
  ```

  Keep the same generator as the final command in `logo:generate` so a complete brand regeneration preserves the selected favicon and Apple touch output.

- [x] **Step 3: Generate the production files**

  Run:

  ```bash
  pnpm run favicon:generate
  ```

  Expected: the stable `artifacts/peps-anonymous/public/favicon.svg` and opaque `artifacts/peps-anonymous/public/brand/salt-peps-apple-touch-180.png` are regenerated from the same source geometry.

### Task 3: Verify the asset and application contracts

**Files:**
- No additional production files.

- [x] **Step 1: Run the favicon integration contract**

  Run:

  ```bash
  node scripts/verify-salt-peps-integration.mjs
  ```

  Expected: PASS with the new blue/white favicon contract.

- [x] **Step 2: Run the raster contract**

  Run:

  ```bash
  node scripts/verify-salt-peps-raster.mjs
  ```

  Expected: PASS with an opaque 180x180 Apple touch icon.

- [x] **Step 3: Render and inspect the final favicon**

  Render `public/favicon.svg` at 180px with `@resvg/resvg-js`, verify nontransparent pixels reach neither edge of the square, and inspect the output for a centered white `S&P` on the blue rounded tile.

- [x] **Step 4: Run the focused application typecheck**

  Run:

  ```bash
  pnpm --filter @workspace/peps-anonymous typecheck
  ```

  Result: the command was run; it reports pre-existing TypeScript errors across the application unrelated to this favicon-only change.
