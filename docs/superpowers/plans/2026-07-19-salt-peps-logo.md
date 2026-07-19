# SALT&PEPS Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate an original peptide-derived SALT&PEPS logo system that remains clear from favicon size through print-scale use.

**Architecture:** A deterministic Node generator owns the 64-unit peptide geometry, outlines the Inter wordmark through OpenType.js, exports the SVG family, and cleans output through SVGO. A focused React component mirrors the canonical icon geometry for navigation use, while static public assets serve favicons and external applications.

**Tech Stack:** Node.js, Maker.js, OpenType.js, SVGO, SVG/XML, React, TypeScript, Vite

---

## File Structure

- `scripts/generate-salt-peps-logo.mjs`: canonical geometry, wordmark outlining, SVG variants, proof generation, and validation-friendly deterministic output.
- `scripts/logo/inter-latin-800-normal.woff`: licensed Inter source used only to outline the wordmark.
- `scripts/logo/OFL.txt`: Inter's SIL Open Font License.
- `artifacts/peps-anonymous/public/brand/*`: generated production logo assets and proof sheet.
- `artifacts/peps-anonymous/public/favicon.svg`: stable favicon URL backed by the new mark.
- `artifacts/peps-anonymous/src/components/SaltPepsMark.tsx`: accessible reusable UI mark.
- `artifacts/peps-anonymous/src/components/PageLayout.tsx`: replaces the old text tile with `SaltPepsMark`.
- `docs/brand/salt-peps-logo-usage.md`: clear space, minimum size, variants, and prohibited usage.
- `scripts/verify-salt-peps-logo.mjs`: asset contract checks for XML, view boxes, colors, effects, and expected outputs.

### Task 1: Add Asset Contract Verification

**Files:**
- Create: `scripts/verify-salt-peps-logo.mjs`

- [ ] **Step 1: Write the failing asset contract**

Create checks for the required SVG names, exact `viewBox` values, approved colors, absent external URLs/gradients/filters/text nodes, and a nonempty path count.

- [ ] **Step 2: Run the verifier before generation**

Run: `node scripts/verify-salt-peps-logo.mjs`

Expected: FAIL because `public/brand/salt-peps-logo.svg` and the rest of the asset family do not exist.

- [ ] **Step 3: Keep the verifier deterministic**

Use only Node built-ins so validation does not depend on browser state. Report every failed contract in one run and exit nonzero.

### Task 2: Build the Canonical Vector Generator

**Files:**
- Create: `scripts/generate-salt-peps-logo.mjs`
- Create: `scripts/logo/inter-latin-800-normal.woff`
- Create: `scripts/logo/OFL.txt`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-icon.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-icon-reverse.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-icon-mono.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-icon-small.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-logo.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-logo-reverse.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-logo-mono.svg`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-social.svg`

- [ ] **Step 1: Construct the peptide mark on a 64-unit grid**

Use Maker.js primitives for the backbone keylines and exact circular nodes. Convert the intended outline to a small number of filled SVG paths with rounded joins. Include two deliberate carbonyl double-bond cues and an optically simplified small-size variant.

- [ ] **Step 2: Outline the wordmark**

Load the locally licensed Inter 800 WOFF through OpenType.js, generate `SALT&PEPS` at a fixed baseline, apply optical tracking, and export only path geometry. Color the ampersand `#2D6BCC` in the primary lockup and merge all characters to white or dark ink for reverse/mono variants.

- [ ] **Step 3: Generate and optimize every SVG**

Run: `node scripts/generate-salt-peps-logo.mjs`

Expected: eight deterministic SVG assets under `artifacts/peps-anonymous/public/brand/`, each with a preserved `viewBox`, title/description metadata where appropriate, and no external resources.

- [ ] **Step 4: Run the asset contract**

Run: `node scripts/verify-salt-peps-logo.mjs`

Expected: PASS with every required asset, palette, XML, and geometry check reported.

### Task 3: Integrate the Shared UI Mark

**Files:**
- Create: `artifacts/peps-anonymous/src/components/SaltPepsMark.tsx`
- Modify: `artifacts/peps-anonymous/src/components/PageLayout.tsx`
- Modify: `artifacts/peps-anonymous/public/favicon.svg`

- [ ] **Step 1: Add a focused React mark component**

Expose `size`, `variant`, `title`, and `className` props. Render the canonical icon geometry with `aria-hidden` when no title is supplied and `role="img"` plus a `<title>` when a title is supplied.

- [ ] **Step 2: Replace the old serif text tile**

Keep the existing 28px and 36px container dimensions in `BrandMark`, render `SaltPepsMark` inside the tile, and remove the font-dependent `S&P` text treatment. Do not alter sidebar expansion, header spacing, theme state, or navigation behavior.

- [ ] **Step 3: Replace the stable favicon asset**

Set `public/favicon.svg` to the generated small-size contained mark with a 180-unit view box and no remote font import.

- [ ] **Step 4: Typecheck the application**

Run: `pnpm --filter @workspace/peps-anonymous typecheck`

Expected: PASS with no TypeScript diagnostics.

### Task 4: Document and Prove Usage

**Files:**
- Create: `docs/brand/salt-peps-logo-usage.md`
- Create: `artifacts/peps-anonymous/public/brand/salt-peps-logo-proof.svg`

- [ ] **Step 1: Generate a proof sheet**

Show primary and reverse horizontal lockups, icon-only variants, monochrome output, and 16/24/32/48/64px size samples on restrained light and dark bands.

- [ ] **Step 2: Write the usage guide**

Document approved files, clear space equal to one icon node diameter, 120px minimum full-logo width, 16px favicon and 24px UI icon minima, approved backgrounds, and prohibited distortion/effects/recoloring.

- [ ] **Step 3: Inspect vector and raster rendering**

Rasterize the proof or capture it in a browser and inspect full scale plus 16/24/32px crops. Confirm the silhouette remains recognizable, double-bond details do not merge, text does not clip, and reverse artwork has sufficient contrast.

### Task 5: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run logo verification**

Run: `node scripts/verify-salt-peps-logo.mjs`

Expected: PASS.

- [ ] **Step 2: Run the application build**

Run: `pnpm --filter @workspace/peps-anonymous build`

Expected: Vite build completes successfully.

- [ ] **Step 3: Inspect the running site**

Start the existing Vite development server on an available port. Capture desktop and mobile screenshots and verify the mark is visible, crisp, centered, and free of overlap in both expanded and compact navigation states.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check` and inspect `git status --short`.

Expected: no whitespace errors; only logo-system files, intended package metadata, and pre-existing user changes appear.

