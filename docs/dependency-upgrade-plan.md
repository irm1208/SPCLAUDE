# Dependency upgrade plan (read before changing any package.json or the lockfile)

Audit of 5 November 2026 (branch audit-fixes): 135 advisories across 40 packages. 104 are in code that runs on the live site, 31 in build/test tooling only. 122 are fixable in place (same major version); 13 need a major version step, most of them inside example projects (crypto-payment-kit, group-buy-refund-tutorial, mockup-sandbox, scripts) that are not the deployed site. Both critical advisories (proxy-addr inside express; dompurify inside jspdf) are same-major fixes.

## Rules
1. Nothing is upgraded until the pipeline is proven on the current code: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, tests, and the API starting locally must all pass on Replit first.
2. One pnpm version for everyone, declared in the root `package.json` `packageManager` field, so the lockfile installs frozen on Replit and elsewhere. Never regenerate the lockfile as a side effect of a build or publish.
3. Tier 1 = same-major updates only (`pnpm update -r`, never `--latest`, never hand-editing version ranges). One branch, one commit including `pnpm-lock.yaml`, full build and test run, audit counts before and after.
4. Tier 2 = major steps, one package per branch per commit: `pdfjs-dist` 5→6 first (browser PDF parsing on two pages; test by parsing a PDF), example-project packages by removing or updating those projects, `zod` 3→4 last and alone (it touches every API route).
5. Publish at a quiet time with nothing else merging that day and the previous deployment ready to switch back.
6. Known pipeline issues to fix before Tier 1: `artifacts/api-server/src/routes/testmedaddy/*` imports `pg` which `artifacts/api-server/package.json` does not declare; `pdf-lib` is declared in peps-anonymous and must be installed before the site builds; the lockfile "overrides" must match package.json.

## Tier 1 packages (same major)
dompurify (via jspdf), proxy-addr / body-parser / qs (via express), vite, multer, sharp, http-proxy-middleware, express-rate-limit, ip-address, @xmldom/xmldom (via mammoth), brace-expansion (via minimatch), follow-redirects, @tiptap/core and prosemirror-view, nanoid and postcss and source-map-js (via vite), tmp (via exceljs), fflate, axios (scripts), plus all build/test tooling (browserslist, svgo, js-yaml, markdown-it, fast-uri, vitest, @babel/core and friends).

## Tier 2 packages (major step)
pdfjs-dist 5→6 (peps-anonymous), zod 3→4 (api-server, lib/db, lib/api-zod, peps-anonymous), esbuild 0.18→0.28 (pinned by drizzle-kit; update drizzle-kit instead), drizzle-orm 0.44→0.45 (crypto-payment-kit example only; the main API already runs 0.45), valibot (via bitcoinjs-lib in crypto-payment-kit verifiers), stream-json and uuid (via jayson, exceljs, gaxios), csv-parse (scripts only), minimatch 10→11 (via typedoc, docs tooling only).

The full table with every advisory, and the exact prompts to run on Replit, are on the Dependency Triage page produced with the Fix Plan.
