# Dependency upgrade plan (read before changing any package.json or the lockfile)

Audit of 5 November 2026 (branch audit-fixes): 135 advisories across 40 packages. 104 are in code that runs on the live site, 31 in build/test tooling only. 122 are fixable in place (same major version); 13 need a major version step, most of them inside example projects (crypto-payment-kit, group-buy-refund-tutorial, mockup-sandbox, scripts) that are not the deployed site. Both critical advisories (proxy-addr inside express; dompurify inside jspdf) are same-major fixes.

## Rules
1. Nothing is upgraded until the pipeline is proven on the current code: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`, tests, and the API starting locally must all pass on Replit first.
2. One pnpm version for everyone, declared in the root `package.json` `packageManager` field, so the lockfile installs frozen on Replit and elsewhere. Never regenerate the lockfile as a side effect of a build or publish.
3. Tier 1 = same-major updates only (`pnpm update -r`, never `--latest`, never hand-editing version ranges). One branch, one commit including `pnpm-lock.yaml`, full build and test run, audit counts before and after.
4. Tier 2 = major steps, one package per branch per commit: `pdfjs-dist` 5→6 first (browser PDF parsing on two pages; test by parsing a PDF), example-project packages by removing or updating those projects, `zod` 3→4 last and alone (it touches every API route).
5. Publish at a quiet time with nothing else merging that day and the previous deployment ready to switch back.
6. Known pipeline issues to fix before Tier 1: `artifacts/api-server/src/routes/testmedaddy/*` imports `pg` which `artifacts/api-server/package.json` does not declare; `pdf-lib` is declared in peps-anonymous and must be installed before the site builds; the lockfile "overrides" must match package.json.

## Baseline check on Replit (5 November 2026) and what was fixed
Replit ran the diagnostic on the current code: Node 20.20.0, pnpm 10.15.1, lockfileVersion 9.0; `pnpm install --frozen-lockfile` PASSED without regenerating the lockfile; both builds PASSED. It found these pipeline gaps, now fixed on branch audit-fixes (commit "Pipeline baseline"):
- Publishing (`scripts/deploy.sh`) used `pnpm install --no-frozen-lockfile`, so a publish could re-resolve dependencies. It now uses `--frozen-lockfile`.
- No `packageManager` pin; now `pnpm@10.15.1` in the root package.json (the version Replit runs), so every environment installs identically.
- `pg` was not declared by api-server although routes/testmedaddy import it; now declared. `vitest` was not declared by peps-anonymous although 58 test files import it; now declared. Lockfile updated minimally and proven to install frozen.
- `lib/*/tsconfig.tsbuildinfo` were tracked, so a clean checkout believed the libraries were built when `dist/` was absent and `pnpm typecheck` reported 2,150 cascading errors. They are untracked and ignored; `tsc --build` now rebuilds the declarations from clean.
- Vitest picked up node:test files (same `*.test.ts` naming) and reported 160 phantom "No test suite found" failures in the frontend and 3 in the API. Both packages now exclude node:test files from Vitest; the frontend run reports 102 real files.
Still open and for the owner to decide: `artifacts/crypto-payment-kit` declares Node >= 22 while Replit runs Node 20 (a warning today; either move Replit to Node 22 or remove the example packages from the workspace); the pre-existing type errors (API about 130, frontend about 200, none blocking the build); the API health check could not be run on Replit without database access and should be done on a copy of the database or by watching the first deploy.
Note on "same-major": `pnpm update -r` honours the declared ranges, so a range such as `*` or `>=x` could still cross a major. Tier 1 therefore ends with a check that no package changed its major version; the Tier 1 prompt includes it.

## Tier 1 packages (same major)
dompurify (via jspdf), proxy-addr / body-parser / qs (via express), vite, multer, sharp, http-proxy-middleware, express-rate-limit, ip-address, @xmldom/xmldom (via mammoth), brace-expansion (via minimatch), follow-redirects, @tiptap/core and prosemirror-view, nanoid and postcss and source-map-js (via vite), tmp (via exceljs), fflate, axios (scripts), plus all build/test tooling (browserslist, svgo, js-yaml, markdown-it, fast-uri, vitest, @babel/core and friends).

## Tier 2 packages (major step)
pdfjs-dist 5→6 (peps-anonymous), zod 3→4 (api-server, lib/db, lib/api-zod, peps-anonymous), esbuild 0.18→0.28 (pinned by drizzle-kit; update drizzle-kit instead), drizzle-orm 0.44→0.45 (crypto-payment-kit example only; the main API already runs 0.45), valibot (via bitcoinjs-lib in crypto-payment-kit verifiers), stream-json and uuid (via jayson, exceljs, gaxios), csv-parse (scripts only), minimatch 10→11 (via typedoc, docs tooling only).

The full table with every advisory, and the exact prompts to run on Replit, are on the Dependency Triage page produced with the Fix Plan.
