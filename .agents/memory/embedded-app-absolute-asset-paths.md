---
name: Embedded third-party build with hardcoded absolute asset paths
description: A standalone Vite/JS app embedded via iframe under a subpath (e.g. public/peptide-explorer/) can have runtime asset fetches (not build-time imports) hardcoded to absolute site-root paths, which silently 404 once nested.
---

## Symptom
Third-party/standalone build embedded via iframe at `/some-subpath/index.html` mostly works, but a specific runtime-loaded resource (e.g. a WASM module, worker script, font) silently fails or shows a "unavailable" fallback UI — no crash, just a degraded feature.

## Root cause
Vite's `base: './'` only rewrites paths for *build-time* asset references (script/link tags, `import`). Runtime code that does its own `fetch('/foo/bar.js')` or `<script src="/foo/bar.js">` with a **hardcoded absolute path** is untouched by the base config. When the app is served from domain root this works by coincidence; once embedded under a subpath it resolves to the wrong (site-root) location.

**Why:** discovered when a copied-in RDKit WASM 2D-structure renderer showed "renderer unavailable" after embedding a standalone peptide-explorer tool under `/peptide-explorer/` in the main app — the minified bundle called `initRDKitModule({locateFile: e => '/rdkit/'+e})` and loaded `/rdkit/RDKit_minimal.js` via a plain absolute `<script src>`, bypassing Vite's relative base entirely.

## How to apply
1. Don't assume `base: './'` protects you — grep the built/minified bundle for the resource's filename to find how it's actually loaded (`grep -o ".\{80\}<filename>.\{80\}"`).
2. If it's a hardcoded absolute path and you can't/don't want to touch the (often minified/no-source) bundle, the simplest fix is to **also serve the same files at the absolute path the bundle expects** — e.g. mirror `public/<subpath>/rdkit/` into `public/rdkit/` at the host app's static root. Vite copies everything under `public/` to the build output automatically, so this fix carries through to production with no extra step.
3. Verify with `curl -o /dev/null -w "%{http_code} %{content_type}"` against the exact absolute path the bundle requests — headless screenshot tools without WebGL/GPU can't visually confirm fixes gated behind a WebGL init that throws first.
